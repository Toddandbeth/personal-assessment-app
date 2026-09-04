"use client";

import { useEffect, useMemo, useState } from "react";
import {
  completeSubmission,
  fetchExistingResponses,
  fetchQuestions,
  saveResponse,
} from "@/lib/assessment";
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

  async function handleGoalBlur() {
    if (!goalQuestion) return;
    const trimmed = goalText.trim();
    if (trimmed.length === 0) return;
    setGoalSaving(true);
    try {
      await saveResponse(submissionId, goalQuestion.id, null, trimmed);
    } catch {
      // Goal is optional; a failed save here just retries on the next blur.
    } finally {
      setGoalSaving(false);
    }
  }

  const allAnswered =
    applicableQuestions.length > 0 &&
    applicableQuestions.every((q) => savedIds.has(q.id));

  async function handleSubmit() {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
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

  if (loadError) {
    return <p className="text-sm text-red-600">{loadError}</p>;
  }

  if (!questions) {
    return <p className="text-sm text-zinc-500">Loading questions...</p>;
  }

  return (
    <div className="flex w-full flex-col gap-8">
      {sections.map((group) => (
        <div key={group.section} className="flex flex-col gap-5">
          <h2 className="-mx-6 bg-[#253551] px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-white">
            {group.section}
          </h2>
          {group.questions.map((q) => (
            <div key={q.id} className="flex flex-col gap-2">
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
        <div className="flex flex-col gap-2">
          <h2 className="-mx-6 bg-[#253551] px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-white">
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

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <button
        type="button"
        disabled={!allAnswered || submitting}
        onClick={handleSubmit}
        className="rounded-full bg-[#253551] px-5 py-3 text-sm font-medium text-white hover:bg-[#1a2740] disabled:opacity-50"
      >
        {submitting
          ? "Submitting..."
          : allAnswered
          ? "Submit Assessment"
          : "Answer all questions to continue"}
      </button>
    </div>
  );
}
