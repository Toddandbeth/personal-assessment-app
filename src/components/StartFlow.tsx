"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EntryForm, { type EntryFormValues } from "@/components/EntryForm";
import ReturningEntryForm, { type ReturningEntryValues } from "@/components/ReturningEntryForm";
import ImEntryForm, { type ImEntryValues } from "@/components/ImEntryForm";
import ReturningPicker from "@/components/ReturningPicker";
import ReturningBaselinePrompt from "@/components/ReturningBaselinePrompt";
import ReturningNotFound from "@/components/ReturningNotFound";
import RetakeConfirmation from "@/components/RetakeConfirmation";
import CompletedPairPrompt from "@/components/CompletedPairPrompt";
import ComingSoonPlaceholder from "@/components/ComingSoonPlaceholder";
import MarriedChildrenGate from "@/components/MarriedChildrenGate";
import QuestionForm from "@/components/QuestionForm";
import ComparisonView from "@/components/ComparisonView";
import ResumePinForm from "@/components/ResumePinForm";
import { useNoPullToRefresh } from "@/components/AssessmentGuards";
import { archiveAndRestart, checkIdentity, findReturning, type IdentityArgs } from "@/lib/identity";
import { getComparison, startSubmission } from "@/lib/assessment";
import { clearResume, isReloadNavigation, loadResume, saveResume, type ResumeState } from "@/lib/resume";
import { DOOR_FULLCOUNT, DOOR_IM, HOME_HREF, type Door } from "@/lib/doors";
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
  | "returning_not_found"
  | "resume_pin";

function friendlyError(err: unknown, fallback: string): string {
  const message = (err as { message?: string } | null)?.message ?? "";
  if (message.includes("too_many_attempts")) {
    return "Too many attempts. Please wait about 15 minutes and try again.";
  }
  return fallback;
}

export default function StartFlow({
  track,
  door = DOOR_FULLCOUNT,
}: {
  track: EntryTrack;
  door?: Door;
}) {
  const router = useRouter();
  const isIm = door === DOOR_IM;
  const homeHref = HOME_HREF[door];
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

  useNoPullToRefresh();

  // Mid-assessment reload recovery (see src/lib/resume.ts). `ready` stays false
  // until we've looked, so a returning person never sees a flash of the
  // empty entry form.
  const [ready, setReady] = useState(false);
  const [resumeSaved, setResumeSaved] = useState<ResumeState | null>(null);

  useEffect(() => {
    const saved = loadResume();
    if (saved && saved.door === door && isReloadNavigation()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastArgs({ ...saved.args, pin: null });
      setCategory(saved.category);
      setSubmissionId(saved.submissionId);
      setIsMarried(saved.isMarried);
      setHasChildren(saved.hasChildren);
      setPendingKind(saved.kind);
      if (saved.door === DOOR_IM) {
        // The PIN is never stored: ask for it again before going on.
        setResumeSaved(saved);
        setPhase("resume_pin");
      } else {
        setPhase("questions");
      }
    } else if (saved) {
      // A fresh visit (not a reload): forget any stale resume point.
      clearResume();
    }
    setReady(true);
  }, [door]);

  // Remember where we are while questions are on screen; forget it once the
  // assessment is submitted.
  useEffect(() => {
    if (phase === "questions" && submissionId && lastArgs && category) {
      const { pin: _pin, ...argsWithoutPin } = lastArgs;
      void _pin;
      saveResume({
        door,
        args: argsWithoutPin,
        category,
        submissionId,
        isMarried,
        hasChildren,
        kind: pendingKind,
      });
    } else if (phase === "baseline_results" || phase === "comparison" || phase === "results_error") {
      clearResume();
    }
  }, [phase, submissionId, lastArgs, category, isMarried, hasChildren, pendingKind, door]);

  async function handleResumePin(pin: string) {
    if (!resumeSaved) return;
    setSubmitting(true);
    setErrorMessage(null);
    const args: IdentityArgs = { ...resumeSaved.args, pin };
    try {
      // The database checks the PIN here. A wrong PIN says "participant not
      // found"; a right one finds the person (and, if they have no completed
      // baseline yet, says so, which also proves the PIN was right).
      await getComparison(args);
    } catch (err) {
      const message = (err as { message?: string } | null)?.message ?? "";
      if (message.includes("too_many_attempts")) {
        setErrorMessage(friendlyError(err, ""));
        setSubmitting(false);
        return;
      }
      if (!message.includes("no completed baseline")) {
        setErrorMessage("That PIN didn't match. Please try again.");
        setSubmitting(false);
        return;
      }
    }
    setLastArgs(args);
    setPhase("questions");
    setSubmitting(false);
  }

  // Every time the screen changes (submit, continue, back, results), start
  // the new screen at the top instead of wherever the last one was scrolled.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [phase, comparisonLoading]);

  function handleSubmit(values: EntryFormValues) {
    return runIdentity({
      track: track as "group" | "standalone",
      region: track === "group" ? values.region : null,
      groupNumber: track === "group" ? values.groupNumber : null,
      standaloneCategory: track === "standalone" ? values.standaloneCategory : null,
      firstName: values.firstName,
      lastFour: values.lastFour,
      door: DOOR_FULLCOUNT,
      pin: null,
    });
  }

  // Intentional Ministries: always the individual path, always the shared
  // adult question list; identity is name + last four + PIN.
  function handleImSubmit(values: ImEntryValues) {
    return runIdentity({
      track: "standalone",
      region: null,
      groupNumber: null,
      standaloneCategory: "men",
      firstName: values.firstName,
      lastFour: values.lastFour,
      door: DOOR_IM,
      pin: values.pin,
    });
  }

  async function runIdentity(args: IdentityArgs) {
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
    } catch (err) {
      setErrorMessage(friendlyError(err, "Something went wrong. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReturningSubmit(values: ReturningEntryValues) {
    if (isIm) {
      // No lookup step on this door: name + last four + PIN go straight to
      // the identity check, and a miss looks identical whether or not any
      // such person exists.
      await resolveReturning({
        track: "standalone",
        region: null,
        groupNumber: null,
        standaloneCategory: "men",
        firstName: values.firstName,
        lastFour: values.lastFour,
        door: DOOR_IM,
        pin: values.pin ?? null,
      });
      return;
    }
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
    } catch (err) {
      setErrorMessage(friendlyError(err, "Something went wrong. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  function resolveReturningCandidate(candidate: ReturningCandidate, identity: ReturningEntryValues) {
    return resolveReturning({
      track: candidate.track,
      region: candidate.region,
      groupNumber: candidate.group_number,
      standaloneCategory: candidate.standalone_category,
      firstName: identity.firstName,
      lastFour: identity.lastFour,
      door: DOOR_FULLCOUNT,
      pin: null,
    });
  }

  async function resolveReturning(args: IdentityArgs) {
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
    } catch (err) {
      setErrorMessage(friendlyError(err, "Something went wrong. Please try again."));
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
    } catch (err) {
      setErrorMessage(friendlyError(err, "Something went wrong starting your assessment. Please try again."));
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
    } catch (err) {
      setErrorMessage(friendlyError(err, "Something went wrong starting your assessment. Please try again."));
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
    } catch (err) {
      setErrorMessage(friendlyError(err, "Something went wrong loading your results. Please try again."));
      setPhase("results_error");
    } finally {
      setComparisonLoading(false);
    }
  }

  async function handleQuestionsCompleted() {
    await loadResults(pendingKind === "baseline" ? "baseline_results" : "comparison");
  }

  if (!ready) return null;

  if (phase === "resume_pin" && resumeSaved) {
    return (
      <ResumePinForm
        firstName={resumeSaved.args.firstName}
        submitting={submitting}
        errorMessage={errorMessage}
        onSubmit={handleResumePin}
        onStartOver={() => {
          clearResume();
          setSubmissionId(null);
          setLastArgs(null);
          setResumeSaved(null);
          setErrorMessage(null);
          setPhase("entry");
        }}
      />
    );
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
        onBackOut={() => router.push(homeHref)}
      />
    );
  }

  if (phase === "view_answers_placeholder") {
    return (
      <ComingSoonPlaceholder
        homeHref={homeHref}
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
        onReturnHome={() => router.push(homeHref)}
      />
    );
  }

  if (phase === "flags") {
    return (
      <MarriedChildrenGate
        plain={isIm}
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
        door={door}
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
        door={door}
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
          href={homeHref}
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
        onBackOut={() => router.push(homeHref)}
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
        onReturnHome={() => router.push(homeHref)}
      />
    );
  }

  if (phase === "returning_not_found") {
    return (
      <ReturningNotFound
        door={door}
        onRetry={() => {
          setErrorMessage(null);
          setPhase("entry");
        }}
      />
    );
  }

  if (comparisonLoading) {
    return <p className="text-center text-sm text-zinc-500">Loading your results...</p>;
  }

  if (track === "returning") {
    return (
      <ReturningEntryForm
        requirePin={isIm}
        submitting={submitting}
        errorMessage={errorMessage}
        onSubmit={handleReturningSubmit}
      />
    );
  }

  if (isIm) {
    return (
      <ImEntryForm
        submitting={submitting}
        errorMessage={errorMessage}
        onSubmit={handleImSubmit}
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
