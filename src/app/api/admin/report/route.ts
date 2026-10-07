import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/session";
import { createServiceClient } from "@/lib/supabase/serviceClient";
import { computeReportUnit, fetchGoalsForParticipants, type ReportUnit } from "@/lib/admin/report";

export async function GET(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");
  const id = searchParams.get("id");
  const full = searchParams.get("full") === "true";
  const yearParam = searchParams.get("year");

  if (!scope || !id) {
    return NextResponse.json({ error: "Missing scope or id." }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    if (scope === "group") {
      const { data: group, error: groupError } = await supabase
        .from("da_groups")
        .select("id, number, region_id")
        .eq("id", id)
        .single();
      if (groupError || !group) {
        return NextResponse.json({ error: "Group not found." }, { status: 404 });
      }

      const { data: region, error: regionError } = await supabase
        .from("da_regions")
        .select("name, category_id")
        .eq("id", group.region_id)
        .single();
      if (regionError || !region) {
        return NextResponse.json({ error: "Region not found." }, { status: 404 });
      }

      const { data: participants } = await supabase
        .from("da_participants")
        .select("id, first_name")
        .eq("group_id", group.id);

      const participantIds = (participants ?? []).map((p) => p.id);

      const unit = await computeReportUnit(
        supabase,
        region.category_id,
        participantIds,
        `${region.name} — Group ${group.number}`
      );

      // Group-scope-only extras: a plain roster of who's completed so far
      // (on-screen/admin-only — never in any PDF), and the anonymous goal
      // texts, split by sitting. The goals also ride along on group units in
      // the region PDF bundle (see scope=region&full=true).
      let completedFirstNames: string[] = [];
      let goalsBaseline: string[] = [];
      let goalsRetake: string[] = [];

      if (participantIds.length > 0) {
        const { data: submissions } = await supabase
          .from("da_submissions")
          .select("id, participant_id, kind")
          .in("participant_id", participantIds)
          .eq("status", "completed")
          .is("archived_at", null);

        const nameById = new Map(
          (participants ?? []).map((p) => [p.id, p.first_name])
        );
        const completedIds = new Set((submissions ?? []).map((s) => s.participant_id));
        completedFirstNames = Array.from(completedIds)
          .map((id) => nameById.get(id))
          .filter((name): name is string => Boolean(name))
          .sort((a, b) => a.localeCompare(b));

        ({ goalsBaseline, goalsRetake } = await fetchGoalsForParticipants(
          supabase,
          region.category_id,
          participantIds
        ));
      }

      return NextResponse.json({
        units: [unit],
        completedFirstNames,
        goalsBaseline,
        goalsRetake,
      });
    }

    if (scope === "region") {
      const { data: region, error: regionError } = await supabase
        .from("da_regions")
        .select("id, name, category_id")
        .eq("id", id)
        .single();
      if (regionError || !region) {
        return NextResponse.json({ error: "Region not found." }, { status: 404 });
      }

      const { data: groups } = await supabase
        .from("da_groups")
        .select("id, number")
        .eq("region_id", region.id)
        .order("number");

      // Fast path (default): the combined unit only, for the initial
      // on-screen click. Per-group detail is fetched lazily via
      // scope=group when a row is expanded.
      if (!full) {
        let participantIds: string[] = [];
        if ((groups ?? []).length > 0) {
          const { data: participants } = await supabase
            .from("da_participants")
            .select("id")
            .in(
              "group_id",
              (groups ?? []).map((g) => g.id)
            );
          participantIds = (participants ?? []).map((p) => p.id);
        }
        const unit = await computeReportUnit(
          supabase,
          region.category_id,
          participantIds,
          `${region.name} — Combined Total`
        );
        return NextResponse.json({
          units: [unit],
          region: { id: region.id, name: region.name },
        });
      }

      // Full bundle (Download PDF / Email): combined page first, then each
      // group's own page — matching the on-screen order (combined total,
      // then individual groups).
      const groupUnits: ReportUnit[] = [];
      const allParticipantIds: string[] = [];
      for (const g of groups ?? []) {
        const { data: participants } = await supabase
          .from("da_participants")
          .select("id")
          .eq("group_id", g.id);

        const groupParticipantIds = (participants ?? []).map((p) => p.id);
        allParticipantIds.push(...groupParticipantIds);

        const groupUnit = await computeReportUnit(
          supabase,
          region.category_id,
          groupParticipantIds,
          `${region.name} — Group ${g.number}`
        );
        // Anonymous goal lists ride along on group pages only, so the PDF
        // matches the on-screen group view.
        const goals = await fetchGoalsForParticipants(
          supabase,
          region.category_id,
          groupParticipantIds
        );
        groupUnits.push({ ...groupUnit, ...goals });
      }

      const units: ReportUnit[] = [];
      if ((groups ?? []).length > 0) {
        units.push(
          await computeReportUnit(
            supabase,
            region.category_id,
            allParticipantIds,
            `${region.name} — Combined Total`
          )
        );
        units.push(...groupUnits);
      }

      return NextResponse.json({
        units,
        region: { id: region.id, name: region.name },
      });
    }

    if (scope === "category") {
      const { data: category, error: categoryError } = await supabase
        .from("da_categories")
        .select("id, name")
        .eq("id", id)
        .single();
      if (categoryError || !category) {
        return NextResponse.json({ error: "Category not found." }, { status: 404 });
      }

      const { data: regions } = await supabase
        .from("da_regions")
        .select("id")
        .eq("category_id", category.id);
      const regionIds = (regions ?? []).map((r) => r.id);

      let groupIds: string[] = [];
      if (regionIds.length > 0) {
        const { data: groups } = await supabase
          .from("da_groups")
          .select("id")
          .in("region_id", regionIds);
        groupIds = (groups ?? []).map((g) => g.id);
      }

      let participantIds: string[] = [];
      if (groupIds.length > 0) {
        const { data: participants } = await supabase
          .from("da_participants")
          .select("id")
          .in("group_id", groupIds);
        participantIds = (participants ?? []).map((p) => p.id);
      }

      const unit = await computeReportUnit(
        supabase,
        category.id,
        participantIds,
        `All ${category.name} Regions`
      );
      return NextResponse.json({
        units: [unit],
        category: { id: category.id, name: category.name },
      });
    }

    if (scope === "general") {
      const year = Number(yearParam);
      if (!Number.isInteger(year)) {
        return NextResponse.json({ error: "Missing or invalid year." }, { status: 400 });
      }

      const { data: category, error: categoryError } = await supabase
        .from("da_categories")
        .select("id, name")
        .eq("id", id)
        .single();
      if (categoryError || !category) {
        return NextResponse.json({ error: "Category not found." }, { status: 404 });
      }

      const { data: standalone } = await supabase
        .from("da_participants")
        .select("id, created_at")
        .eq("category_id", category.id)
        .eq("is_standalone", true);

      const participantIds = (standalone ?? [])
        .filter((p) => new Date(p.created_at).getFullYear() === year)
        .map((p) => p.id);

      const unit = await computeReportUnit(
        supabase,
        category.id,
        participantIds,
        `General ${year} – ${category.name}`
      );
      return NextResponse.json({
        units: [unit],
        category: { id: category.id, name: category.name },
        year,
      });
    }

    return NextResponse.json({ error: "Invalid scope." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to generate report." }, { status: 500 });
  }
}
