import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/session";
import { createServiceClient } from "@/lib/supabase/serviceClient";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Category name is required." }, { status: 400 });
  }

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: "That name isn't usable — try adding some letters." }, { status: 400 });
  }

  const supabase = createServiceClient();

  // No admin UI to create/select ministries yet (deferred) — every
  // category belongs to the one hardcoded ministry for now.
  const { data: ministry, error: ministryError } = await supabase
    .from("da_ministries")
    .select("id")
    .eq("name", "Full Count")
    .single();
  if (ministryError || !ministry) {
    return NextResponse.json({ error: "Failed to resolve ministry." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("da_categories")
    .insert({ name, slug, ministry_id: ministry.id })
    .select("id, slug, name")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A category with that name already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to create category." }, { status: 500 });
  }

  return NextResponse.json({ category: data });
}
