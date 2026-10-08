"use client";

import { useEffect, useMemo, useState } from "react";
import {
  completeSubmission,
  fetchExistingResponses,
  fetchQuestions,
  saveResponse,
} from "@/lib/assessment";
import { InProgressMarker } from "@/components/AssessmentGuards";
import type { Question } from "@/lib/supabase/types";

const SCORES = [1, 2, 3, 4, 5];

export default function QuestionForm({
  submissionId,
  categorySlug,
  isMarried,
  hasChildren,
  onCompleted,
}: {
  submissionId: string;
  categorySlug: string;
  isMarried: boolean | null;
  hasChildren: boolean | null;
  onCompleted: () => void | Promise<void>;
}) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());
  const [goalText, setGoalText] = useState("");
  const [goalSaving, setGoalSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchQuestions(categorySlug), fetchExistingResponses(submissionId)])
      .then(([questionData, existing]) => {
        if (cancelled) return;
        setQuestions(questionData);

        // Resuming an interrupted submission: pre-fill whatever was
        // already saved so nothing looks lost.
        const goalQ = questionData.find((q) => q.is_goal);
        const nextAnswers: Record<string, number> = {};
        const nextSaved = new Set<string>();
        for (const r of existing) {
          if (goalQ && r.question_id === goalQ.id) {
            if (r.answer_text) setGoalText(r.answer_text);
            continue;
          }
          if (r.score !== null) {
            nextAnswers[r.question_id] = r.score;
            nextSaved.add(r.question_id);
          }
        }
        setAnswers(nextAnswers);
        setSavedIds(nextSaved);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Couldn't load the questions. Please refresh and try again.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [categorySlug, submissionId]);

  // Switching between the question list and the review screen starts at the
  // top. (Tapping Change on a review row scrolls to that question afterwards.)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [reviewing]);

  const applicableQuestions = useMemo(() => {
    if (!questions) return [];
    return questions.filter((q) => {
      if (q.is_goal) return false;
      if (q.conditional_flag === null) return true;
      if (q.conditional_flag === "married") return isMarried === true;
      if (q.conditional_flag === "has_children") return hasChildren === true;
      if (q.conditional_flag === "single") return isMarried === false;
      return true;
    });
  }, [questions, isMarried, hasChildren]);

  const goalQuestion = useMemo(
    () => questions?.find((q) => q.is_goal) ?? null,
    [questions]
  );

  const sections = useMemo(() => {
    const groups: { section: string; questions: Question[] }[] = [];
    for (const q of applicableQuestions) {
      const last = groups[groups.length - 1];
      if (last && last.section === q.section) {
        last.questions.push(q);
      } else {
        groups.push({ section: q.section, questions: [q] });
      }
    }
    return groups;
  }, [applicableQuestions]);

  async function handleSelect(question: Question, score: number) {
    setAnswers((prev) => ({ ...prev, [question.id]: score }));
    setErrorIds((prev) => {
      const next = new Set(prev);
      next.delete(question.id);
      return next;
    });
    try {
      await saveResponse(submissionId, question.id, score, null);
      setSavedIds((prev) => new Set(prev).add(question.id));
    } catch {
      setErrorIds((prev) => new Set(prev).add(question.id));
    }
  }

  // Saves the goal explicitly. Relying only on the textarea's blur event is
  // unreliable (tapping a button on a phone often doesn't blur it), so this
  // also runs before review and before final submit.
  async function persistGoal(): Promise<boolean> {
    if (!goalQuestion) return true;
    const trimmed = goalText.trim();
    if (trimmed.length === 0) return true;
    setGoalSaving(true);
    try {
      await saveResponse(submissionId, goalQuestion.id, null, trimmed);
      return true;
    } catch {
      return false;
    } finally {
      setGoalSaving(false);
    }
  }

  async function handleGoalBlur() {
    await persistGoal();
  }

  async function handleReview() {
    if (!allAnswered) return;
    await persistGoal();
    setReviewing(true);
  }

  const allAnswered =
    applicableQuestions.length > 0 &&
    applicableQuestions.every((q) => savedIds.has(q.id));

  async function handleSubmit() {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (!(await persistGoal())) {
        setSubmitError("We couldn't save your goal. Please try again.");
        return;
      }
      await completeSubmission(submissionId);
      await onCompleted();
    } catch {
      setSubmitError(
        "Something went wrong submitting your assessment. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function goToQuestion(questionId: string) {
    setReviewing(false);
    // Wait for the editable view to render before trying to scroll to it.
    requestAnimationFrame(() => {
      document.getElementById(`question-${questionId}`)?.scrollIntoView({ block: "center" });
    });
  }

  if (loadError) {
    return <p className="text-sm text-red-600">{loadError}</p>;
  }

  if (!questions) {
    return <p className="text-sm text-zinc-500">Loading questions...</p>;
  }

  if (reviewing) {
    return (
      <div className="flex w-full flex-col gap-6">
        <InProgressMarker />
        <div>
          <h1 className="text-xl font-semibold text-[#253551]">
            Almost done. Review your answers, then tap Confirm.
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Tap Change on anything you&apos;d like to update before submitting.
          </p>
        </div>

        {sections.map((group) => (
          <div key={group.section} className="flex flex-col gap-3">
            <h2 className="section-bar -mx-6 bg-[#253551] px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-white">
              {group.section}
            </h2>
            {group.questions.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-[#ccd0d6]/20 p-3"
              >
                <div>
                  <p className="text-sm text-zinc-800">{q.prompt}</p>
                  <p className="mt-1 text-lg font-bold text-[#253551]">{answers[q.id]}</p>
                </div>
                <button
                  type="button"
                  onClick={() => goToQuestion(q.id)}
                  className="shrink-0 rounded-full border border-[#ccd0d6] px-3 py-1.5 text-xs font-medium text-[#253551] hover:bg-white"
                >
                  Change
                </button>
              </div>
            ))}
          </div>
        ))}

        {goalQuestion && goalText.trim() && (
          <div className="flex items-start justify-between gap-3 rounded-lg bg-[#ccd0d6]/20 p-3">
            <div>
              <p className="text-sm text-zinc-800">{goalQuestion.prompt}</p>
              <p className="mt-1 text-sm text-zinc-700">{goalText}</p>
            </div>
            <button
              type="button"
              onClick={() => goToQuestion(goalQuestion.id)}
              className="shrink-0 rounded-full border border-[#ccd0d6] px-3 py-1.5 text-xs font-medium text-[#253551] hover:bg-white"
            >
              Change
            </button>
          </div>
        )}

        {/* Room so the pinned bar below never covers the last answer */}
        <div className="h-32" aria-hidden />

        {/* Pinned to the bottom of the screen so Confirm is always in view */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#ccd0d6] bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-6px_16px_-8px_rgba(26,34,51,0.25)]">
          <div className="mx-auto flex w-full max-w-md flex-col gap-2 sm:max-w-xl lg:max-w-2xl">
            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="rounded-full bg-[#253551] px-5 py-3 text-sm font-medium text-white hover:bg-[#1a2740] disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Confirm & Submit"}
            </button>
            <button
              type="button"
              onClick={() => setReviewing(false)}
              className="py-1 text-sm font-medium text-[#7993c2] hover:text-[#253551]"
            >
              ← Back to editing
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <InProgressMarker />
      {sections.map((group) => (
        <div key={group.section} className="flex flex-col gap-5">
          <h2 className="section-bar -mx-6 bg-[#253551] px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-white">
            {group.section}
          </h2>
          {group.questions.map((q) => (
            <div key={q.id} id={`question-${q.id}`} className="flex flex-col gap-2 scroll-mt-6">
              <p className="text-base font-semibold text-zinc-900">{q.prompt}</p>
              <div className="flex gap-2">
                {SCORES.map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => handleSelect(q, score)}
                    className={`flex h-10 flex-1 items-center justify-center rounded-lg border text-sm font-medium ${
                      answers[q.id] === score
                        ? "border-[#253551] bg-[#253551] text-white"
                        : "border-[#ccd0d6] bg-white text-zinc-700 hover:bg-[#ccd0d6]/40"
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
              {errorIds.has(q.id) && (
                <p className="text-xs text-red-600">
                  Couldn&apos;t save that answer — tap a number again to retry.
                </p>
              )}
            </div>
          ))}
        </div>
      ))}

      {goalQuestion && (
        <div id={`question-${goalQuestion.id}`} className="flex flex-col gap-2 scroll-mt-6">
          <h2 className="section-bar -mx-6 bg-[#253551] px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-white">
            {goalQuestion.section}
          </h2>
          <p className="text-base font-semibold text-zinc-900">{goalQuestion.prompt}</p>
          <p className="text-xs text-zinc-500">
            Optional and private — never shown to leadership.
          </p>
          <textarea
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            onBlur={handleGoalBlur}
            rows={4}
            className="rounded-lg border border-[#ccd0d6] bg-white px-3 py-2 text-base text-zinc-900 focus:border-[#7993c2] focus:outline-none"
          />
          {goalSaving && <p className="text-xs text-zinc-400">Saving...</p>}
        </div>
      )}

      <button
        type="button"
        disabled={!allAnswered}
        onClick={handleReview}
        className="rounded-full bg-[#253551] px-5 py-3 text-sm font-medium text-white hover:bg-[#1a2740] disabled:opacity-50"
      >
        {allAnswered ? "Review & Submit" : "Answer all questions to continue"}
      </button>
    </div>
  );
}
