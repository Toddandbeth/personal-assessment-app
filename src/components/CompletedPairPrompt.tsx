"use client";

import { useState } from "react";

export default function CompletedPairPrompt({
  onSeeResults,
  onStartNew,
  onReturnHome,
}: {
  onSeeResults: () => void;
  onStartNew: () => Promise<void>;
  onReturnHome: () => void;
}) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStartNew() {
    setStarting(true);
    setError(null);
    try {
      await onStartNew();
    } catch {
      setError("Something went wrong starting a new assessment. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 text-center">
      <h1 className="text-xl font-semibold text-[#253551]">
        You&apos;ve already completed your assessment.
      </h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-3">
        <button
          onClick={onSeeResults}
          className="rounded-full border border-[#ccd0d6] px-5 py-2.5 text-sm font-medium text-[#253551] hover:bg-[#ccd0d6]/40"
        >
          See my results again
        </button>
        <button
          onClick={handleStartNew}
          disabled={starting}
          className="rounded-full bg-[#253551] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1a2740] disabled:opacity-50"
        >
          {starting ? "Starting..." : "Start a new assessment"}
        </button>
        <button
          onClick={onReturnHome}
          className="text-sm font-medium text-[#7993c2] hover:text-[#253551]"
        >
          Return to home screen
        </button>
      </div>
    </div>
  );
}
