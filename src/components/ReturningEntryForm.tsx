"use client";

import { useState, type FormEvent } from "react";

export interface ReturningEntryValues {
  firstName: string;
  lastFour: string;
  pin?: string;
}

export default function ReturningEntryForm({
  requirePin = false,
  submitting,
  errorMessage,
  onSubmit,
}: {
  // requirePin = the Intentional Ministries door: also asks for the PIN, and
  // sits plainly inside that door's own card (no navy frame).
  requirePin?: boolean;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: ReturningEntryValues) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [pin, setPin] = useState("");

  const canSubmit =
    firstName.trim().length > 0 &&
    /^\d{4}$/.test(lastFour.trim()) &&
    (!requirePin || /^\d{4}$/.test(pin));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    onSubmit(requirePin ? { firstName, lastFour, pin } : { firstName, lastFour });
  }

  const inputClass =
    "rounded-lg border border-[#ccd0d6] bg-white px-3 py-2 text-base text-zinc-900 focus:border-[#7993c2] focus:outline-none";

  const form = (
    <form
      onSubmit={handleSubmit}
      className={`flex w-full flex-col gap-4 ${requirePin ? "" : "rounded-xl bg-white p-6"}`}
    >
      {requirePin && (
        <h1 className="text-2xl font-bold text-[#253551]">Welcome back</h1>
      )}
      <p className="rounded-lg bg-[#ccd0d6]/40 p-3 text-xs leading-5 text-zinc-700 sm:text-sm">
        {requirePin
          ? "Enter the same first name, last four digits of your phone number, and 4-digit PIN you used before."
          : "Enter the same first name and phone number you used before, and we'll find your record."}
      </p>

      <label className="flex flex-col gap-1 text-sm font-medium text-[#253551]">
        First Name
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className={inputClass}
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
          className={inputClass}
          autoComplete="off"
        />
      </label>

      {requirePin && (
        <label className="flex flex-col gap-1 text-sm font-medium text-[#253551]">
          Your 4-digit PIN
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className={inputClass}
            autoComplete="off"
          />
        </label>
      )}

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="mt-2 rounded-full bg-[#253551] px-6 py-4 text-base font-semibold text-white hover:bg-[#1a2740] disabled:opacity-50"
      >
        {submitting ? "Looking..." : "Continue"}
      </button>
    </form>
  );

  if (requirePin) return form;
  return <div className="w-full rounded-2xl bg-[#253551] p-2.5 shadow-sm">{form}</div>;
}
