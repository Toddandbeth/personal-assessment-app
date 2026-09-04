"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EntryForm, { type EntryFormValues } from "@/components/EntryForm";
import RetakeConfirmation from "@/components/RetakeConfirmation";
import CompletedPairPrompt from "@/components/CompletedPairPrompt";
import ComingSoonPlaceholder from "@/components/ComingSoonPlaceholder";
import MarriedChildrenGate from "@/components/MarriedChildrenGate";
import QuestionForm from "@/components/QuestionForm";
import ComparisonView from "@/components/ComparisonView";
import { archiveAndRestart, checkIdentity, type IdentityArgs } from "@/lib/identity";
import { getComparison, startSubmission } from "@/lib/assessment";
import type {
  ComparisonRow,
  StandaloneCategory,
  SubmissionKind,
  Track,
} from "@/lib/supabase/types";

type Phase =
  | "entry"
  | "begin"
  | "retake"
  | "view_answers_placeholder"
  | "completed_pair"
  | "flags"
  | "questions"
  | "baseline_done"
  | "comparison";

export default function StartFlow({ track }: { track: Track }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("entry");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [goalText, setGoalText] = useState<string | null>(null);
  const [lastArgs, setLastArgs] = useState<IdentityArgs | null>(null);
  const [category, setCategory] = useState<StandaloneCategory | null>(null);

  const [pendingKind, setPendingKind] = useState<SubmissionKind>("baseline");
  const [isMarried, setIsMarried] = useState<boolean | null>(null);
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [flagsSubmitting, setFlagsSubmitting] = useState(false);
  const [comparisonRows, setComparisonRows] = useState<ComparisonRow[]>([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  async function handleSubmit(values: EntryFormValues) {
    const args: IdentityArgs = {
      track,
      region: track === "group" ? values.region : null,
      groupNumber: track === "group" ? values.groupNumber : null,
      standaloneCategory: track === "standalone" ? values.standaloneCategory : null,
      firstName: values.firstName,
      lastFour: values.lastFour,
    };

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await checkIdentity(args);
      setLastArgs(args);
      setGoalText(result.goal_text);
      setCategory(result.category);

      switch (result.status) {
        case "group_not_found":
          setErrorMessage(
            "We couldn't find that group. Please check with your group leader and try again."
          );
          break;
        case "first_time":
          // Skip the "You're all set!" confirmation for genuinely
          // first-time takers — straight into flags (Men)/questions. Pass
          // args/category explicitly since the setLastArgs/setCategory
          // calls above haven't committed yet in this render.
          await beginSubmission("baseline", args, result.category);
          break;
        case "retake":
          setPhase("retake");
          break;
        case "completed_pair":
          setPhase("completed_pair");
          break;
      }
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function beginSubmission(
    kind: SubmissionKind,
    argsOverride?: IdentityArgs,
    categoryOverride?: StandaloneCategory | null
  ) {
    const effectiveArgs = argsOverride ?? lastArgs;
    const effectiveCategory = categoryOverride ?? category;
    if (!effectiveArgs) return;
    setPendingKind(kind);

    if (effectiveCategory === "men") {
      setPhase("flags");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await startSubmission(effectiveArgs, kind, null, null);
      setSubmissionId(result.submission_id);
      setIsMarried(null);
      setHasChildren(null);
      setPhase("questions");
    } catch {
      setErrorMessage("Something went wrong starting your assessment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFlagsSubmit(married: boolean, children: boolean) {
    if (!lastArgs) return;
    setFlagsSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await startSubmission(lastArgs, pendingKind, married, children);
      setSubmissionId(result.submission_id);
      setIsMarried(married);
      setHasChildren(children);
      setPhase("questions");
    } catch {
      setErrorMessage("Something went wrong starting your assessment. Please try again.");
    } finally {
      setFlagsSubmitting(false);
    }
  }

  async function handleQuestionsCompleted() {
    if (pendingKind === "baseline") {
      setPhase("baseline_done");
      return;
    }

    if (!lastArgs) return;
    setComparisonLoading(true);
    try {
      const result = await getComparison(lastArgs);
      setComparisonRows(result.rows);
      setPhase("comparison");
    } catch {
      setErrorMessage("Your retake was saved, but we couldn't load your comparison.");
      setPhase("baseline_done");
    } finally {
      setComparisonLoading(false);
    }
  }

  async function handleSeeResults() {
    if (!lastArgs) return;
    setComparisonLoading(true);
    try {
      const result = await getComparison(lastArgs);
      setComparisonRows(result.rows);
      setPhase("comparison");
    } catch {
      setErrorMessage("Something went wrong loading your results. Please try again.");
    } finally {
      setComparisonLoading(false);
    }
  }

  if (phase === "begin") {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <h1 className="text-xl font-semibold text-[#253551]">You&apos;re all set!</h1>
        <p className="max-w-sm text-zinc-600">
          We found you, and this looks like your first assessment.
        </p>
        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
        <button
          onClick={() => beginSubmission("baseline")}
          disabled={submitting}
          className="rounded-full bg-[#253551] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1a2740] disabled:opacity-50"
        >
          {submitting ? "Starting..." : "Begin Assessment"}
        </button>
      </div>
    );
  }

  if (phase === "retake") {
    return (
      <RetakeConfirmation
        goalText={goalText}
        onViewAnswers={() => setPhase("view_answers_placeholder")}
        onContinue={() => beginSubmission("retake")}
        onBackOut={() => router.push("/")}
      />
    );
  }

  if (phase === "view_answers_placeholder") {
    return (
      <ComingSoonPlaceholder
        heading="Your original answers"
        message="Viewing your original baseline answers isn't built yet."
        note="Say the word and we'll add it."
      />
    );
  }

  if (phase === "completed_pair") {
    return (
      <CompletedPairPrompt
        onSeeResults={handleSeeResults}
        onStartNew={async () => {
          if (!lastArgs) return;
          await archiveAndRestart(lastArgs);
          setPhase("begin");
        }}
        onReturnHome={() => router.push("/")}
      />
    );
  }

  if (phase === "flags") {
    return (
      <MarriedChildrenGate
        submitting={flagsSubmitting}
        errorMessage={errorMessage}
        onSubmit={handleFlagsSubmit}
      />
    );
  }

  if (phase === "questions" && submissionId && category) {
    return (
      <QuestionForm
        submissionId={submissionId}
        categorySlug={category}
        isMarried={isMarried}
        hasChildren={hasChildren}
        onCompleted={handleQuestionsCompleted}
      />
    );
  }

  if (phase === "baseline_done") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-xl font-semibold text-[#253551]">All done — thank you!</h1>
        <p className="max-w-sm text-zinc-600">
          Your assessment has been saved. When your group does a retake, come back
          here and use the same details to see your before-and-after comparison.
        </p>
        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
        <Link
          href="/"
          className="mt-2 rounded-full border border-[#ccd0d6] px-5 py-2 text-sm font-medium text-[#253551] hover:bg-[#ccd0d6]/40"
        >
          Return to home screen
        </Link>
      </div>
    );
  }

  if (phase === "comparison") {
    return <ComparisonView rows={comparisonRows} firstName={lastArgs?.firstName ?? ""} />;
  }

  if (comparisonLoading) {
    return <p className="text-center text-sm text-zinc-500">Loading your results...</p>;
  }

  return (
    <EntryForm
      track={track}
      submitting={submitting}
      errorMessage={errorMessage}
      onSubmit={handleSubmit}
    />
  );
}
