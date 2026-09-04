"use client";

import { useState, type FormEvent } from "react";
import type { StandaloneCategory, Track } from "@/lib/supabase/types";

export interface EntryFormValues {
  region: string;
  groupNumber: string;
  standaloneCategory: StandaloneCategory | null;
  firstName: string;
  lastFour: string;
}

export default function EntryForm({
  track,
  submitting,
  errorMessage,
  onSubmit,
}: {
  track: Track;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: EntryFormValues) => void;
}) {
  const [region, setRegion] = useState("");
  const [groupNumber, setGroupNumber] = useState("");
  const [standaloneCategory, setStandaloneCategory] =
    useState<StandaloneCategory | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastFour, setLastFour] = useState("");

  const isStandalone = track === "standalone";
  const canSubmit =
    firstName.trim().length > 0 &&
    /^\d{4}$/.test(lastFour.trim()) &&
    (isStandalone
      ? standaloneCategory !== null
      : region.trim().length > 0 && groupNumber.trim().length > 0);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    onSubmit({ region, groupNumber, standaloneCategory, firstName, lastFour });
  }

  return (
    <div className="w-full rounded-2xl bg-[#253551] p-2.5 shadow-sm">
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-4 rounded-xl bg-white p-6"
      >
        <p className="rounded-lg bg-[#ccd0d6]/40 p-3 text-xs leading-5 text-zinc-700">
          Your individual answers are private. Only group and category averages are
          ever visible to leadership.
        </p>

        {isStandalone && (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-base font-semibold text-[#253551]">
              Are you in high school, or are you an adult?
            </legend>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStandaloneCategory("high_school")}
                className={`flex-1 rounded-lg border-2 px-6 py-4 text-base font-semibold ${
                  standaloneCategory === "high_school"
                    ? "border-[#253551] bg-[#253551] text-white"
                    : "border-[#253551]/30 bg-white text-[#253551] hover:bg-[#ccd0d6]/20"
                }`}
              >
                High School
              </button>
              <button
                type="button"
                onClick={() => setStandaloneCategory("men")}
                className={`flex-1 rounded-lg border-2 px-6 py-4 text-base font-semibold ${
                  standaloneCategory === "men"
                    ? "border-[#253551] bg-[#253551] text-white"
                    : "border-[#253551]/30 bg-white text-[#253551] hover:bg-[#ccd0d6]/20"
                }`}
              >
                Adult
              </button>
            </div>
          </fieldset>
        )}

        {!isStandalone && (
          <>
            <label className="flex flex-col gap-1 text-sm font-medium text-[#253551]">
              Region
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. TN2026"
                className="rounded-lg border border-[#ccd0d6] bg-white px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-[#7993c2] focus:outline-none"
                autoComplete="off"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-[#253551]">
              Group Number
              <input
                type="text"
                value={groupNumber}
                onChange={(e) => setGroupNumber(e.target.value)}
                placeholder="e.g. 03"
                className="rounded-lg border border-[#ccd0d6] bg-white px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-[#7993c2] focus:outline-none"
                autoComplete="off"
              />
            </label>
          </>
        )}

        <label className="flex flex-col gap-1 text-sm font-medium text-[#253551]">
          First Name
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="rounded-lg border border-[#ccd0d6] bg-white px-3 py-2 text-base text-zinc-900 focus:border-[#7993c2] focus:outline-none"
            autoComplete="off"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-[#253551]">
          Last Four of Phone Number
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={lastFour}
            onChange={(e) => setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="rounded-lg border border-[#ccd0d6] bg-white px-3 py-2 text-base text-zinc-900 focus:border-[#7993c2] focus:outline-none"
            autoComplete="off"
          />
        </label>

        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="mt-2 rounded-full bg-[#253551] px-6 py-4 text-base font-semibold text-white hover:bg-[#1a2740] disabled:opacity-50"
        >
          {submitting ? "Checking..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
