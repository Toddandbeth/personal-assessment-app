"use client";

import { useState } from "react";

function YesNoToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-lg font-semibold text-[#253551]">{label}</legend>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex-1 rounded-lg border-2 px-6 py-4 text-base font-semibold ${
            value === true
              ? "border-[#253551] bg-[#253551] text-white"
              : "border-[#253551]/30 bg-white text-[#253551] hover:bg-[#ccd0d6]/40"
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex-1 rounded-lg border-2 px-6 py-4 text-base font-semibold ${
            value === false
              ? "border-[#253551] bg-[#253551] text-white"
              : "border-[#253551]/30 bg-white text-[#253551] hover:bg-[#ccd0d6]/40"
          }`}
        >
          No
        </button>
      </div>
    </fieldset>
  );
}

export default function MarriedChildrenGate({
  plain = false,
  submitting,
  errorMessage,
  onSubmit,
}: {
  // plain = no navy frame (Intentional Ministries already sits in a card).
  plain?: boolean;
  submitting: boolean;
  errorMessage?: string | null;
  onSubmit: (isMarried: boolean, hasChildren: boolean) => void;
}) {
  const [isMarried, setIsMarried] = useState<boolean | null>(null);
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);

  const canSubmit = isMarried !== null && hasChildren !== null;

  return (
    <div className={plain ? "w-full" : "w-full rounded-2xl bg-[#253551] p-2.5 shadow-sm"}>
      <div className={`flex w-full flex-col gap-6 ${plain ? "" : "rounded-xl bg-white p-6"}`}>
        <h1 className="text-2xl font-bold text-[#253551]">
          A couple of questions before we begin.
        </h1>
        <YesNoToggle
          label="Are you currently married?"
          value={isMarried}
          onChange={setIsMarried}
        />
        <YesNoToggle
          label="Do you have children?"
          value={hasChildren}
          onChange={setHasChildren}
        />
        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
        <button
          type="button"
          disabled={!canSubmit || submitting}
          onClick={() => canSubmit && onSubmit(isMarried!, hasChildren!)}
          className="mt-2 rounded-full bg-[#253551] px-6 py-4 text-base font-semibold text-white hover:bg-[#1a2740] disabled:opacity-50"
        >
          {submitting ? "Starting..." : "Continue"}
        </button>
      </div>
    </div>
  );
}
