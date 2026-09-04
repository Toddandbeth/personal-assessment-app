export default function RetakeConfirmation({
  goalText,
  onViewAnswers,
  onContinue,
  onBackOut,
}: {
  goalText: string | null;
  onViewAnswers: () => void;
  onContinue: () => void;
  onBackOut: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 text-center">
      <h1 className="text-xl font-semibold text-[#253551]">
        You&apos;re about to complete the final part of your assessment.
      </h1>
      <p className="text-zinc-600">
        This will compare your answers to what you entered previously.
      </p>

      {goalText && (
        <div className="rounded-lg bg-[#ccd0d6]/40 p-4 text-left">
          <p className="text-sm font-medium text-zinc-700">
            Here&apos;s the goal you set for yourself this year:
          </p>
          <p className="mt-1 text-zinc-800">{goalText}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <button
          onClick={onViewAnswers}
          className="rounded-full border border-[#ccd0d6] px-5 py-2.5 text-sm font-medium text-[#253551] hover:bg-[#ccd0d6]/40"
        >
          View your original answers first
        </button>
        <button
          onClick={onContinue}
          className="rounded-full bg-[#253551] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1a2740]"
        >
          Continue to the retake questions
        </button>
        <button
          onClick={onBackOut}
          className="text-sm font-medium text-[#7993c2] hover:text-[#253551]"
        >
          Back out
        </button>
      </div>
    </div>
  );
}
