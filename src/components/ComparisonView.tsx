"use client";

import Link from "next/link";
import DeliveryControls from "@/components/DeliveryControls";
import { deltaColor, formatDelta } from "@/lib/reportVisuals";
import type { ComparisonRow } from "@/lib/supabase/types";

function ChangeCell({ before, after }: { before: number | null; after: number | null }) {
  if (before === null || after === null) {
    return <span className="text-zinc-300">–</span>;
  }
  const delta = after - before;
  const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "–";
  return (
    <span className="font-semibold" style={{ color: deltaColor(delta) }}>
      {arrow} {formatDelta(delta)}
    </span>
  );
}

export default function ComparisonView({
  rows,
  firstName = "",
  baselineOnly = false,
  goalBaseline = null,
  goalRetake = null,
}: {
  rows: ComparisonRow[];
  firstName?: string;
  baselineOnly?: boolean;
  goalBaseline?: string | null;
  goalRetake?: string | null;
}) {
  const sections: { section: string; rows: ComparisonRow[] }[] = [];
  for (const row of rows) {
    const last = sections[sections.length - 1];
    if (last && last.section === row.section) {
      last.rows.push(row);
    } else {
      sections.push({ section: row.section, rows: [row] });
    }
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <Link href="/" className="self-start text-sm font-medium text-[#7993c2] hover:text-[#253551]">
        ← Home
      </Link>
      <div className="text-center">
        <h1 className="text-xl font-semibold" style={{ color: "#253551" }}>
          Your Results
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          {baselineOnly ? "Your answers from this assessment" : "Before-and-after comparison"}
        </p>
      </div>

      {(goalBaseline || goalRetake) && (
        <div className="flex flex-col gap-3 rounded-lg bg-[#ccd0d6]/40 p-4">
          {goalBaseline && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#253551" }}>
                Your goal
              </p>
              <p className="mt-1 text-sm text-zinc-800">{goalBaseline}</p>
            </div>
          )}
          {goalRetake && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#253551" }}>
                Your goal going forward
              </p>
              <p className="mt-1 text-sm text-zinc-800">{goalRetake}</p>
            </div>
          )}
        </div>
      )}

      {sections.map((group) => (
        <div key={group.section} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "#253551" }}>
            {group.section}
          </h2>
          <div
            className="flex flex-col divide-y rounded-lg"
            style={{ backgroundColor: "#ffffff", border: "1px solid #ccd0d6" }}
          >
            <div
              className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-zinc-600"
              style={{ backgroundColor: "#ccd0d6" }}
            >
              <span className="flex-1">Question</span>
              <span className="w-10 text-center">{baselineOnly ? "Score" : "Before"}</span>
              {!baselineOnly && (
                <>
                  <span className="w-10 text-center">After</span>
                  <span className="w-16 text-center">Change</span>
                </>
              )}
            </div>
            {group.rows.map((row) => (
              <div
                key={row.prompt}
                className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-800"
                style={{ borderColor: "#ccd0d6" }}
              >
                <span className="flex-1">{row.prompt}</span>
                <span className="w-10 text-center">{row.baseline_score ?? "–"}</span>
                {!baselineOnly && (
                  <>
                    <span className="w-10 text-center">{row.retake_score ?? "–"}</span>
                    <span className="w-16 text-center">
                      <ChangeCell before={row.baseline_score} after={row.retake_score} />
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <DeliveryControls
        pdfEndpoint="/api/report/pdf"
        emailEndpoint="/api/report/email"
        payload={{ rows, firstName, baselineOnly, goalBaseline, goalRetake }}
        downloadFilename="personal-assessment-results.pdf"
      />

      <Link
        href="/"
        className="rounded-full px-5 py-2.5 text-center text-sm font-medium text-white hover:opacity-90"
        style={{ backgroundColor: "#7993c2" }}
      >
        Return to home screen
      </Link>
    </div>
  );
}
