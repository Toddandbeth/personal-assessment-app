"use client";

import type { ReturningCandidate } from "@/lib/supabase/types";

function candidateLabel(c: ReturningCandidate): string {
  if (c.track === "group") {
    return `${c.region} — Group ${c.group_number}`;
  }
  const categoryLabel = c.standalone_category === "high_school" ? "High School" : "Adult";
  return `${categoryLabel} — On your own`;
}

export default function ReturningPicker({
  candidates,
  onPick,
  onBackOut,
}: {
  candidates: ReturningCandidate[];
  onPick: (candidate: ReturningCandidate) => void;
  onBackOut: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 text-center">
      <h1 className="text-xl font-semibold text-[#253551]">
        We found more than one match — which one is yours?
      </h1>

      <div className="flex flex-col gap-3">
        {candidates.map((c, i) => (
          <button
            key={i}
            onClick={() => onPick(c)}
            className="rounded-lg border-2 border-[#253551]/30 bg-white px-4 py-3 text-left text-sm font-medium text-[#253551] hover:bg-[#ccd0d6]/20"
          >
            {candidateLabel(c)}
          </button>
        ))}
      </div>

      <button
        onClick={onBackOut}
        className="text-sm font-medium text-[#7993c2] hover:text-[#253551]"
      >
        Back out
      </button>
    </div>
  );
}
