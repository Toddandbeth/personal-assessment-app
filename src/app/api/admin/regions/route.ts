import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/session";
import { createServiceClient } from "@/lib/supabase/serviceClient";

const MAX_BATCH = 200;

export async function POST(request: Request) {
  if (!(await isAdminRequest("fullcount"))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const categoryId = typeof body?.categoryId === "string" ? body.categoryId : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const count = Number(body?.count);

  if (!categoryId || !name) {
    return NextResponse.json({ error: "Category and region name are required." }, { status: 400 });
  }
  if (!Number.isInteger(count) || count < 1 || count > MAX_BATCH) {
    return NextResponse.json(
      { error: `Number of groups must be between 1 and ${MAX_BATCH}.` },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: createdRegion, error: regionError } = await supabase
    .from("da_regions")
    .insert({ category_id: categoryId, name })
    .select("id, name")
    .single();

  if (regionError) {
    if (regionError.code === "23505") {
      return NextResponse.json(
        {
          error:
            "That region already exists — use Add Groups instead if you want to add to it.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to create region." }, { status: 500 });
  }

  const numbers = Array.from({ length: count }, (_, i) => String(i + 1).padStart(2, "0"));
  const { error: groupsError } = await supabase
    .from("da_groups")
    .insert(numbers.map((number) => ({ region_id: createdRegion.id, number })));

  if (groupsError) {
    // Compensate so nothing is left half-created.
    await supabase.from("da_regions").delete().eq("id", createdRegion.id);
    return NextResponse.json({ error: "Failed to create groups." }, { status: 500 });
  }

  return NextResponse.json({
    region: { id: createdRegion.id, name: createdRegion.name, groupCount: count },
  });
}
