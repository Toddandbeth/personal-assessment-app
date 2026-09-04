import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/session";
import { createServiceClient } from "@/lib/supabase/serviceClient";

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const supabase = createServiceClient();

  const [
    { data: categories, error: categoriesError },
    { data: regions, error: regionsError },
    { data: groups, error: groupsError },
    { data: standalone, error: standaloneError },
  ] = await Promise.all([
    supabase.from("da_categories").select("id, slug, name").order("name"),
    supabase.from("da_regions").select("id, category_id, name, created_at").order("created_at", { ascending: false }),
    supabase.from("da_groups").select("id, region_id"),
    supabase
      .from("da_participants")
      .select("category_id, created_at")
      .eq("is_standalone", true),
  ]);

  if (categoriesError || regionsError || groupsError || standaloneError) {
    return NextResponse.json({ error: "Failed to load overview." }, { status: 500 });
  }

  const countByRegionId = new Map<string, number>();
  for (const g of groups ?? []) {
    countByRegionId.set(g.region_id, (countByRegionId.get(g.region_id) ?? 0) + 1);
  }

  const yearsByCategoryId = new Map<string, Set<number>>();
  for (const p of standalone ?? []) {
    const year = new Date(p.created_at).getFullYear();
    if (!yearsByCategoryId.has(p.category_id)) {
      yearsByCategoryId.set(p.category_id, new Set());
    }
    yearsByCategoryId.get(p.category_id)!.add(year);
  }

  const result = (categories ?? []).map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    regions: (regions ?? [])
      .filter((r) => r.category_id === category.id)
      .map((r) => ({
        id: r.id,
        name: r.name,
        groupCount: countByRegionId.get(r.id) ?? 0,
      })),
    generalYears: Array.from(yearsByCategoryId.get(category.id) ?? []).sort((a, b) => b - a),
  }));

  return NextResponse.json({ categories: result });
}
