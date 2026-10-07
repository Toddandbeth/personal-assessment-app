import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/session";
import { createServiceClient } from "@/lib/supabase/serviceClient";
import { computeReportUnit } from "@/lib/admin/report";

// Intentional Ministries admin report: one overall report across every
// Intentional Ministries participant (optionally narrowed to a year). Only
// Intentional Ministries responses are ever included, and no goals — this
// route never reads them.
export async function GET(request: Request) {
  if (!(await isAdminRequest("intentionalministries"))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const yearParam = new URL(request.url).searchParams.get("year");
  const year = yearParam ? Number(yearParam) : null;
  if (year !== null && !Number.isInteger(year)) {
    return NextResponse.json({ error: "Invalid year." }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: category } = await supabase
    .from("da_categories")
    .select("id")
    .eq("slug", "men")
    .single();
  if (!category) {
    return NextResponse.json({ error: "Question list not found." }, { status: 500 });
  }

  const { data: participants } = await supabase
    .from("da_participants")
    .select("id, created_at")
    .eq("door", "intentionalministries");

  const years = Array.from(
    new Set((participants ?? []).map((p) => new Date(p.created_at).getFullYear()))
  ).sort((a, b) => b - a);

  const ids = (participants ?? [])
    .filter((p) => year === null || new Date(p.created_at).getFullYear() === year)
    .map((p) => p.id);

  const unit = await computeReportUnit(
    supabase,
    category.id,
    ids,
    year === null ? "Intentional Ministries — Overall" : `Intentional Ministries — ${year}`
  );

  return NextResponse.json({ units: [unit], years });
}
