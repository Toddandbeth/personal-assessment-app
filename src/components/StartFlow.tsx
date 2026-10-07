"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EntryForm, { type EntryFormValues } from "@/components/EntryForm";
import ReturningEntryForm, { type ReturningEntryValues } from "@/components/ReturningEntryForm";
import ReturningPicker from "@/components/ReturningPicker";
import ReturningBaselinePrompt from "@/components/ReturningBaselinePrompt";
import ReturningNotFound from "@/components/ReturningNotFound";
import RetakeConfirmation from "@/components/RetakeConfirmation";
import CompletedPairPrompt from "@/components/CompletedPairPrompt";
import ComingSoonPlaceholder from "@/components/ComingSoonPlaceholder";
import MarriedChildrenGate from "@/components/MarriedChildrenGate";
import QuestionForm from "@/components/QuestionForm";
import ComparisonView from "@/components/ComparisonView";
import { archiveAndRestart, checkIdentity, findReturning, type IdentityArgs } from "@/lib/identity";
import { getComparison, startSubmission } from "@/lib/assessment";
import type {
  ComparisonRow,
  EntryTrack,
  ReturningCandidate,
  StandaloneCategory,
  SubmissionKind,
} from "@/lib/supabase/types";

type Phase =
  | "entry"
  | "begin"
  | "retake"
  | "view_answers_placeholder"
  | "completed_pair"
  | "flags"
  | "questions"
  | "baseline_results"
  | "comparison"
  | "results_error"
  | "returning_picker"
  | "returning_baseline_prompt"
  | "returning_not_found";

export default function StartFlow({ track }: { track: EntryTrack }) {
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
  const [goalBaseline, setGoalBaseline] = useState<string | null>(null);
  const [goalRetake, setGoalRetake] = useState<string | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  const [returningIdentity, setReturningIdentity] = useState<ReturningEntryValues | null>(null);
  const [returningCandidates, setReturningCandidates] = useState<ReturningCandidate[]>([]);

  async function handleSubmit(values: EntryFormValues) {
    const args: IdentityArgs = {
      track: track as "group" | "standalone",
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

  async function handleReturningSubmit(values: ReturningEntryValues) {
    setReturningIdentity(values);
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await findReturning(values.firstName, values.lastFour);
      if (result.status === "not_found") {
        setPhase("returning_not_found");
      } else if (result.status === "single") {
        await resolveReturningCandidate(result, values);
      } else {
        setReturningCandidates(result.candidates);
        setPhase("returning_picker");
      }
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resolveReturningCandidate(
    candidate: ReturningCandidate,
    identity: ReturningEntryValues
  ) {
    const args: IdentityArgs = {
      track: candidate.track,
      region: candidate.region,
      groupNumber: candidate.group_number,
      standaloneCategory: candidate.standalone_category,
      firstName: identity.firstName,
      lastFour: identity.lastFour,
    };
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await checkIdentity(args);
      setLastArgs(args);
      setGoalText(result.goal_text);
      setCategory(result.category);

      if (result.status === "retake") {
        // Exactly one completed submission (baseline) and no retake yet —
        // the case item 2 calls "results from last time, or complete the
        // final assessment."
        setPhase("returning_baseline_prompt");
      } else if (result.status === "completed_pair") {
        setPhase("completed_pair");
      } else {
        // "first_time" here means a record exists but nothing's been
        // completed yet (an abandoned in-progress baseline) — there's
        // nothing to return to, so this is treated the same as no match.
        setPhase("returning_not_found");
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

    // Married/children is only ever asked at baseline — a retake always
    // inherits those values automatically (da_start_submission resolves
    // them server-side), so it never shows this screen.
    if (kind === "baseline" && effectiveCategory === "men") {
      setPhase("flags");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await startSubmission(effectiveArgs, kind, null, null);
      setSubmissionId(result.submission_id);
      setIsMarried(result.is_married);
      setHasChildren(result.has_children);
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
      setIsMarried(result.is_married);
      setHasChildren(result.has_children);
      setPhase("questions");
    } catch {
      setErrorMessage("Something went wrong starting your assessment. Please try again.");
    } finally {
      setFlagsSubmitting(false);
    }
  }

  async function loadResults(targetPhase: "baseline_results" | "comparison") {
    if (!lastArgs) return;
    setComparisonLoading(true);
    try {
      const result = await getComparison(lastArgs);
      setComparisonRows(result.rows);
      setGoalBaseline(result.goal_baseline ?? null);
      setGoalRetake(result.goal_retake ?? null);
      setPhase(targetPhase);
    } catch {
      setErrorMessage("Something went wrong loading your results. Please try again.");
      setPhase("results_error");
    } finally {
      setComparisonLoading(false);
    }
  }

  async function handleQuestionsCompleted() {
    await loadResults(pendingKind === "baseline" ? "baseline_results" : "comparison");
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
        onBackOut={() => router.push("/fullcount")}
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
        onSeeResults={() => loadResults("comparison")}
        onStartNew={async () => {
          if (!lastArgs) return;
          await archiveAndRestart(lastArgs);
          setPhase("begin");
        }}
        onReturnHome={() => router.push("/fullcount")}
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

  if (phase === "baseline_results") {
    return (
      <ComparisonView
        rows={comparisonRows}
        firstName={lastArgs?.firstName ?? ""}
        goalBaseline={goalBaseline}
        goalRetake={goalRetake}
        baselineOnly
      />
    );
  }

  if (phase === "comparison") {
    return (
      <ComparisonView
        rows={comparisonRows}
        firstName={lastArgs?.firstName ?? ""}
        goalBaseline={goalBaseline}
        goalRetake={goalRetake}
      />
    );
  }

  if (phase === "results_error") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-xl font-semibold text-[#253551]">Your assessment was saved</h1>
        <p className="max-w-sm text-zinc-600">
          We just couldn&apos;t load your results right now. Please try again later using
          the same details.
        </p>
        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
        <Link
          href="/fullcount"
          className="mt-2 rounded-full border border-[#ccd0d6] px-5 py-2 text-sm font-medium text-[#253551] hover:bg-[#ccd0d6]/40"
        >
          Return to home screen
        </Link>
      </div>
    );
  }

  if (phase === "returning_picker") {
    return (
      <ReturningPicker
        candidates={returningCandidates}
        onPick={(c) => returningIdentity && resolveReturningCandidate(c, returningIdentity)}
        onBackOut={() => router.push("/fullcount")}
      />
    );
  }

  if (phase === "returning_baseline_prompt") {
    return (
      <ReturningBaselinePrompt
        submitting={submitting}
        errorMessage={errorMessage}
        onSeeResults={() => loadResults("baseline_results")}
        onCompleteAssessment={() => beginSubmission("retake")}
        onReturnHome={() => router.push("/fullcount")}
      />
    );
  }

  if (phase === "returning_not_found") {
    return <ReturningNotFound />;
  }

  if (comparisonLoading) {
    return <p className="text-center text-sm text-zinc-500">Loading your results...</p>;
  }

  if (track === "returning") {
    return (
      <ReturningEntryForm
        submitting={submitting}
        errorMessage={errorMessage}
        onSubmit={handleReturningSubmit}
      />
    );
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
