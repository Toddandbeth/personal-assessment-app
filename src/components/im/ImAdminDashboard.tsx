"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReportView from "@/components/admin/ReportView";
import type { ReportUnit } from "@/lib/admin/report";

// Intentional Ministries admin: one overall report (optionally one year).
// No groups, no regions, no goals, no names.
export default function ImAdminDashboard() {
  const router = useRouter();
  const [year, setYear] = useState<string>("");
  const [years, setYears] = useState<number[]>([]);
  const [units, setUnits] = useState<ReportUnit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (selectedYear: string) => {
      try {
        const res = await fetch(
          `/api/im-admin/report${selectedYear ? `?year=${selectedYear}` : ""}`
        );
        if (res.status === 401) {
          router.refresh();
          return;
        }
        if (!res.ok) throw new Error();
        const data = await res.json();
        setUnits(data.units);
        setYears(data.years);
        setError(null);
      } catch {
        setError("Couldn't load the report.");
      }
    },
    [router]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(year);
  }, [load, year]);

  async function handleLogout() {
    await fetch("/api/im-admin/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#253551]">Admin</h1>
        <button
          onClick={handleLogout}
          className="text-sm font-medium text-[#7993c2] hover:text-[#253551]"
        >
          Log out
        </button>
      </div>

      <label className="flex items-center gap-3 text-sm font-medium text-[#253551]">
        Show
        <select
          value={year}
          onChange={(e) => {
            setUnits(null);
            setYear(e.target.value);
          }}
          className="rounded-lg border border-[#ccd0d6] bg-white px-3 py-2 text-base text-zinc-900"
        >
          <option value="">Everyone (overall)</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!units && !error && <p className="text-sm text-zinc-500">Loading...</p>}
      {units && <ReportView units={units} door="intentionalministries" />}
    </div>
  );
}
