"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReportView from "@/components/admin/ReportView";
import type { ReportUnit } from "@/lib/admin/report";

export default function GeneralReportView({
  categoryId,
  year,
}: {
  categoryId: string;
  year: number;
}) {
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [units, setUnits] = useState<ReportUnit[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/report?scope=general&id=${categoryId}&year=${year}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        setUnits(data.units);
        setCategoryName(data.category?.name ?? null);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load report.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId, year]);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/fullcount/admin" className="text-sm font-medium text-[#7993c2] hover:text-[#253551]">
        ← Back to Admin
      </Link>

      {loading && <p className="text-sm text-zinc-500">Loading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {units && (
        <>
          <h1 className="text-xl font-semibold text-[#253551]">
            General {year}{" "}
            <span className="text-base font-normal text-zinc-400">— {categoryName}</span>
          </h1>
          <ReportView units={units} />
        </>
      )}
    </div>
  );
}
