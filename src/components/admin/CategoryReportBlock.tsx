"use client";

import { useState } from "react";
import Link from "next/link";
import RegionRow from "@/components/admin/RegionRow";
import GeneralYearRow from "@/components/admin/GeneralYearRow";

const VISIBLE_REGIONS = 5;

export interface CategoryOverview {
  id: string;
  slug: string;
  name: string;
  regions: { id: string; name: string; groupCount: number }[];
  generalYears: number[];
}

export default function CategoryReportBlock({
  category,
  onChanged,
}: {
  category: CategoryOverview;
  onChanged: () => void;
}) {
  const [showAllRegions, setShowAllRegions] = useState(false);

  const visibleRegions = showAllRegions
    ? category.regions
    : category.regions.slice(0, VISIBLE_REGIONS);
  const hiddenCount = category.regions.length - visibleRegions.length;

  return (
    <div className="rounded-lg border border-[#ccd0d6] bg-[#ccd0d6]/20 p-4">
      <Link
        href={`/fullcount/admin/report/category/${category.id}`}
        className="flex items-center gap-2 text-base font-semibold text-[#253551] hover:underline"
      >
        {category.name}
        <span className="text-sm font-normal text-zinc-400">— all regions combined</span>
      </Link>

      <div className="mt-4 flex flex-col gap-1">
        {category.regions.length === 0 ? (
          <p className="text-xs text-zinc-500">No regions yet.</p>
        ) : (
          <>
            {visibleRegions.map((region) => (
              <RegionRow key={region.id} region={region} onGroupAdded={onChanged} />
            ))}
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllRegions(true)}
                className="mt-1 self-start text-xs font-medium text-[#7993c2] underline hover:text-[#253551]"
              >
                See {hiddenCount} more region{hiddenCount === 1 ? "" : "s"}
              </button>
            )}
          </>
        )}

        {category.generalYears.map((year) => (
          <GeneralYearRow key={year} categoryId={category.id} year={year} />
        ))}
      </div>
    </div>
  );
}
