"use client";

export default function ReturningBaselinePrompt({
  submitting,
  errorMessage,
  onSeeResults,
  onCompleteAssessment,
  onReturnHome,
}: {
  submitting: boolean;
  errorMessage: string | null;
  onSeeResults: () => void;
  onCompleteAssessment: () => void;
  onReturnHome: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 text-center">
      <h1 className="text-xl font-semibold text-[#253551]">
        Would you like to see your results from last time, or complete the
        final assessment?
      </h1>

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      <div className="flex flex-col gap-3">
        <button
          onClick={onSeeResults}
          className="rounded-full border border-[#ccd0d6] px-5 py-2.5 text-sm font-medium text-[#253551] hover:bg-[#ccd0d6]/40"
        >
          See my results from last time
        </button>
        <button
          onClick={onCompleteAssessment}
          disabled={submitting}
          className="rounded-full bg-[#253551] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1a2740] disabled:opacity-50"
        >
          {submitting ? "Starting..." : "Complete the final assessment"}
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
