"use client";

import { useState, type FormEvent } from "react";

// Shown on the Intentional Ministries door after a page reload mid-assessment.
// The name and last four are remembered for this tab; the PIN never is.
export default function ResumePinForm({
  firstName,
  submitting,
  errorMessage,
  onSubmit,
  onStartOver,
}: {
  firstName: string;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (pin: string) => void;
  onStartOver: () => void;
}) {
  const [pin, setPin] = useState("");
  const canSubmit = /^\d{4}$/.test(pin);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (canSubmit && !submitting) onSubmit(pin);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <h1 className="text-2xl font-bold text-[#253551]">Welcome back, {firstName}</h1>
      <p className="rounded-lg bg-[#ccd0d6]/40 p-3 text-sm leading-6 text-zinc-700">
        The page reloaded, but your answers so far are saved. Enter your 4-digit PIN to pick up
        where you left off.
      </p>
      <label className="flex flex-col gap-1 text-sm font-medium text-[#253551]">
        Your 4-digit PIN
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
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
      <button
        type="button"
        onClick={onStartOver}
        className="text-sm font-medium text-[#7993c2] underline hover:text-[#253551]"
      >
        Not me, or start over
      </button>
    </form>
  );
}
