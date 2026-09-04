import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/session";
import { createServiceClient } from "@/lib/supabase/serviceClient";

const MAX_BATCH = 200;

// Lists the individual groups under a region — used to render the
// expandable group rows under a Region.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { id: regionId } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("da_groups")
    .select("id, number")
    .eq("region_id", regionId)
    .order("number");

  if (error) {
    return NextResponse.json({ error: "Failed to load groups." }, { status: 500 });
  }

  return NextResponse.json({ groups: data ?? [] });
}

// Append-only: reads the current max group number for this region and
// inserts new rows after it. Never updates, deletes, or renumbers any
// existing da_groups row — that guarantee is what this whole route exists
// to protect (spec Section 3).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { id: regionId } = await params;
  const body = await request.json().catch(() => null);
  const count = Number(body?.count);

  if (!Number.isInteger(count) || count < 1 || count > MAX_BATCH) {
    return NextResponse.json(
      { error: `Number of groups must be between 1 and ${MAX_BATCH}.` },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: existing, error: existingError } = await supabase
    .from("da_groups")
    .select("number")
    .eq("region_id", regionId);

  if (existingError) {
    return NextResponse.json({ error: "Failed to look up existing groups." }, { status: 500 });
  }
  if (!existing || existing.length === 0) {
    return NextResponse.json({ error: "Region not found." }, { status: 404 });
  }

  const parsedNumbers = existing.map((g) => parseInt(g.number, 10)).filter((n) => !isNaN(n));
  const maxNum = parsedNumbers.length ? Math.max(...parsedNumbers) : 0;
  const padWidth = Math.max(2, ...existing.map((g) => g.number.length));

  const newNumbers = Array.from({ length: count }, (_, i) =>
    String(maxNum + i + 1).padStart(padWidth, "0")
  );

  const { error: insertError } = await supabase
    .from("da_groups")
    .insert(newNumbers.map((number) => ({ region_id: regionId, number })));

  if (insertError) {
    return NextResponse.json({ error: "Failed to add groups." }, { status: 500 });
  }

  return NextResponse.json({ groupCount: existing.length + count });
}
