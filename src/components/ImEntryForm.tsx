"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export interface ImEntryValues {
  firstName: string;
  lastFour: string;
  pin: string;
}

// Intentional Ministries "Begin" screen: first name, last four, and a new
// 4-digit PIN (typed twice). Identity on this door is all three together.
export default function ImEntryForm({
  submitting,
  errorMessage,
  onSubmit,
}: {
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: ImEntryValues) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");

  const pinOk = /^\d{4}$/.test(pin);
  const mismatch = pinConfirm.length === 4 && pin !== pinConfirm;
  const canSubmit =
    firstName.trim().length > 0 &&
    /^\d{4}$/.test(lastFour.trim()) &&
    pinOk &&
    pin === pinConfirm;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    onSubmit({ firstName, lastFour, pin });
  }

  const inputClass =
    "rounded-lg border border-[#ccd0d6] bg-white px-3 py-2 text-base text-zinc-900 focus:border-[#7993c2] focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <h1 className="text-3xl font-bold text-[#253551]">Let&apos;s get started</h1>
      <p className="rounded-lg bg-[#ccd0d6]/40 p-3 text-sm leading-6 text-zinc-700">
        Your individual answers are private. Only combined totals are ever seen
        by Intentional Ministries.
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

      <div className="rounded-xl border-2 border-[#253551]/20 p-4">
        <p className="text-base font-semibold text-[#253551]">Create a 4-digit PIN</p>
        <p className="mt-1 text-sm leading-6 text-zinc-700">
          You&apos;ll use your first name, phone digits, and this PIN to come back
          and see your results.{" "}
          <strong>
            If you forget your PIN, there is no way to get back in or recover your
            results. Write it down.
          </strong>
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-[#253551]">
            PIN
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
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-[#253551]">
            Type it again
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className={inputClass}
              autoComplete="off"
            />
          </label>
        </div>
        {mismatch && <p className="mt-2 text-sm text-red-600">The two PINs don&apos;t match.</p>}
      </div>

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="mt-2 rounded-full bg-[#253551] px-6 py-4 text-base font-semibold text-white hover:bg-[#1a2740] disabled:opacity-50"
      >
        {submitting ? "Checking..." : "Continue"}
      </button>

      <p className="text-center text-sm text-zinc-600">
        Already taken it?{" "}
        <Link
          href="/assessment?track=returning"
          className="font-medium text-[#7993c2] underline hover:text-[#253551]"
        >
          I&apos;m returning
        </Link>
      </p>
    </form>
  );
}
