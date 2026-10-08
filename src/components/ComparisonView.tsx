"use client";

import Link from "next/link";
import DeliveryControls from "@/components/DeliveryControls";
import { deltaColor, formatDelta } from "@/lib/reportVisuals";
import { DOOR_FULLCOUNT, DOOR_IM, HOME_HREF, type Door } from "@/lib/doors";
import { IM_SITE } from "@/lib/imSite";
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
  door = DOOR_FULLCOUNT,
}: {
  rows: ComparisonRow[];
  firstName?: string;
  baselineOnly?: boolean;
  goalBaseline?: string | null;
  goalRetake?: string | null;
  door?: Door;
}) {
  const homeHref = HOME_HREF[door];
  const sections: { section: string; rows: ComparisonRow[] }[] = [];
  for (const row of rows) {
    const last = sections[sections.length - 1];
    if (last && last.section === row.section) {
      last.rows.push(row);
    } else {
      sections.push({ section: row.section, rows: [row] });
    }
  }

  const isIm = door === DOOR_IM;
  // Intentional Ministries: square condensed button like the website's.
  // Full Count keeps its familiar pill shape.
  const buttonClass = isIm
    ? "inline-flex min-h-12 items-center justify-center whitespace-nowrap border-2 border-[#253551] px-3 py-3 text-center font-[family-name:var(--font-barlow-condensed)] text-[0.95rem] font-semibold uppercase tracking-[0.04em] text-[#253551] hover:bg-[#253551] hover:text-white"
    : "inline-flex min-h-11 items-center justify-center rounded-full border border-[#253551] px-5 py-2.5 text-center text-sm font-medium text-[#253551] hover:bg-[#253551] hover:text-white";

  return (
    <div className="flex w-full flex-col gap-8">
      {/* Done message, delivery buttons and the way out come first, so they
          are on screen right away; the list of answers follows. */}
      <div className="flex flex-col gap-5 border-l-4 border-[#7993c2] bg-[#eef1f6] p-5">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#253551" }}>
            You&apos;re done{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-1 text-sm text-zinc-700">
            {baselineOnly
              ? "Your assessment is saved. Your answers are below."
              : "Your final assessment is saved. Here is how you've grown."}
          </p>
        </div>

        <DeliveryControls
          pdfEndpoint="/api/report/pdf"
          emailEndpoint="/api/report/email"
          payload={{ rows, firstName, baselineOnly, goalBaseline, goalRetake, door }}
          downloadFilename="personal-assessment-results.pdf"
        />

        <div className="flex flex-col gap-3 border-t border-[#ccd0d6] pt-5">
          {isIm ? (
            <a href={IM_SITE} className={buttonClass}>
              Back to intentionalministries.com
            </a>
          ) : (
            <Link href={homeHref} className={buttonClass}>
              Back to the Full Count home screen
            </Link>
          )}
          <p className="text-sm text-zinc-700">
            Want to take it again? Come back any time, tap{" "}
            <Link href={isIm ? "/assessment?track=returning" : "/fullcount/start?track=returning"} className="font-semibold text-[#253551] underline">
              I&apos;m returning
            </Link>
            , and enter your details.
          </p>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold" style={{ color: "#253551" }}>
          Your Results
        </h2>
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

    </div>
  );
}
