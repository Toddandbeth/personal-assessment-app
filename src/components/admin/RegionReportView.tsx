"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DeliveryControls from "@/components/DeliveryControls";
import ReportUnitCard from "@/components/admin/ReportUnitCard";
import type { ReportUnit } from "@/lib/admin/report";

const VISIBLE_GROUPS = 3;

interface GroupOption {
  id: string;
  number: string;
}

function GroupSubRow({ group }: { group: GroupOption }) {
  const [expanded, setExpanded] = useState(false);
  const [unit, setUnit] = useState<ReportUnit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (unit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/report?scope=group&id=${group.id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load group report.");
        return;
      }
      setUnit(data.units[0]);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-zinc-700 hover:bg-white"
      >
        <span className="text-[#7993c2]">{expanded ? "▾" : "▸"}</span>
        Group {group.number}
      </button>
      {expanded && (
        <div className="pl-4">
          {loading && <p className="text-xs text-zinc-500">Loading...</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
          {unit && <ReportUnitCard unit={unit} />}
        </div>
      )}
    </div>
  );
}

export default function RegionReportView({ regionId }: { regionId: string }) {
  const [regionName, setRegionName] = useState<string | null>(null);
  const [unit, setUnit] = useState<ReportUnit | null>(null);
  const [groups, setGroups] = useState<GroupOption[] | null>(null);
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/admin/report?scope=region&id=${regionId}`).then((res) =>
        res.ok ? res.json() : Promise.reject()
      ),
      fetch(`/api/admin/regions/${regionId}/groups`).then((res) =>
        res.ok ? res.json() : Promise.reject()
      ),
    ])
      .then(([reportData, groupsData]) => {
        if (cancelled) return;
        setUnit(reportData.units[0]);
        setRegionName(reportData.region?.name ?? null);
        setGroups(groupsData.groups);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load region report.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [regionId]);

  async function fetchFullPayload() {
    const res = await fetch(`/api/admin/report?scope=region&id=${regionId}&full=true`);
    const data = await res.json();
    return { units: data.units as ReportUnit[] };
  }

  const visibleGroups = groups
    ? showAllGroups
      ? groups
      : groups.slice(0, VISIBLE_GROUPS)
    : [];
  const hiddenCount = (groups?.length ?? 0) - visibleGroups.length;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin" className="text-sm font-medium text-[#7993c2] hover:text-[#253551]">
        ← Back to Admin
      </Link>

      {loading && <p className="text-sm text-zinc-500">Loading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {unit && (
        <>
          <h1 className="text-xl font-semibold text-[#253551]">{regionName}</h1>

          <DeliveryControls
            pdfEndpoint="/api/admin/report/pdf"
            emailEndpoint="/api/admin/report/email"
            payload={fetchFullPayload}
            downloadFilename={`personal-assessment-report-${regionName}.pdf`}
            emailButtonLabel="Email to myself"
          />

          <ReportUnitCard unit={unit} />

          {groups && groups.length > 0 && (
            <div className="flex flex-col gap-1 rounded-lg bg-[#ccd0d6]/30 p-2">
              <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Individual Groups
              </p>
              {visibleGroups.map((g) => (
                <GroupSubRow key={g.id} group={g} />
              ))}
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllGroups(true)}
                  className="mt-1 self-start px-2 text-xs font-medium text-[#7993c2] underline hover:text-[#253551]"
                >
                  Show {hiddenCount} more group{hiddenCount === 1 ? "" : "s"}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
