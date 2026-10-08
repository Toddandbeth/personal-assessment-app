"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { clearResume } from "@/lib/resume";
import { isAssessmentInProgress, setAssessmentInProgress, subscribeInProgress } from "@/lib/inProgress";

// A link that leaves the assessment for the main website. If the person is in
// the middle of the questions, it asks first. Answers are saved as they go,
// so leaving never loses them; "I'm returning" brings them back.
export default function ImLeaveLink({
  href,
  className,
  ariaLabel,
  children,
}: {
  href: string;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  const inProgress = useSyncExternalStore(subscribeInProgress, isAssessmentInProgress, () => false);
  const [asking, setAsking] = useState(false);

  return (
    <>
      <a
        href={href}
        className={className}
        aria-label={ariaLabel}
        onClick={(e) => {
          if (inProgress) {
            e.preventDefault();
            setAsking(true);
          }
        }}
      >
        {children}
      </a>

      {asking && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-title"
        >
          <div className="w-full max-w-sm border border-gray bg-white">
            <div className="h-1.5 bg-blue" aria-hidden />
            <div className="flex flex-col gap-5 p-6">
              <h2 id="leave-title" className="display text-[2rem] text-navy">
                Leave the assessment?
              </h2>
              <p className="text-lg leading-snug">
                Your answers so far are saved, and you can come back with{" "}
                <span className="font-semibold">I&apos;m returning</span>.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setAsking(false)}
                  className="inline-flex min-h-12 items-center justify-center bg-navy px-6 py-3 font-display text-[1.1rem] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-ink"
                >
                  Keep going
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Stand down the "are you sure you want to reload" warning, then go.
                    setAssessmentInProgress(false);
                    clearResume();
                    window.location.href = href;
                  }}
                  className="inline-flex min-h-12 items-center justify-center border-2 border-navy px-6 py-3 font-display text-[1.1rem] font-semibold uppercase tracking-[0.1em] text-navy transition-colors hover:bg-navy hover:text-white"
                >
                  Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
