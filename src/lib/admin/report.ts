import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface StatBlock {
  avg: number | null;
  min: number | null;
  max: number | null;
  count: number;
  total: number;
}

export interface GrowthBlock {
  avgDelta: number | null;
  min: number | null;
  max: number | null;
  count: number;
}

export interface ReportQuestionStat {
  questionId: string;
  prompt: string;
  displayOrder: number;
  baseline: StatBlock;
  retake: StatBlock;
  growth: GrowthBlock;
}

export interface ReportSection {
  section: string;
  questions: ReportQuestionStat[];
}

export interface ReportUnit {
  title: string;
  baselineTotal: number;
  retakeTotal: number;
  sections: ReportSection[];
  // Only set on single-group units (anonymous plain-text goal lists). Never
  // set on combined/region/category/general units.
  goalsBaseline?: string[];
  goalsRetake?: string[];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function computeStatBlock(scores: number[], total: number): StatBlock {
  if (scores.length === 0) {
    return { avg: null, min: null, max: null, count: 0, total };
  }
  const sum = scores.reduce((a, b) => a + b, 0);
  return {
    avg: round1(sum / scores.length),
    min: Math.min(...scores),
    max: Math.max(...scores),
    count: scores.length,
    total,
  };
}

function computeGrowthBlock(deltas: number[]): GrowthBlock {
  if (deltas.length === 0) {
    return { avgDelta: null, min: null, max: null, count: 0 };
  }
  const sum = deltas.reduce((a, b) => a + b, 0);
  return {
    avgDelta: round1(sum / deltas.length),
    min: Math.min(...deltas),
    max: Math.max(...deltas),
    count: deltas.length,
  };
}

// Point-in-time averages (baseline, retake) and the growth/change average
// are computed independently and never blended — see spec Section 8. Growth
// only ever includes participants who answered a given question at BOTH
// baseline and retake; goal responses are never fetched at all (privacy).
export async function computeReportUnit(
  supabase: SupabaseClient,
  categoryId: string,
  participantIds: string[],
  title: string
): Promise<ReportUnit> {
  if (participantIds.length === 0) {
    return { title, baselineTotal: 0, retakeTotal: 0, sections: [] };
  }

  const [{ data: questions }, { data: submissions }] = await Promise.all([
    supabase
      .from("da_questions")
      .select("id, section, prompt, display_order")
      .eq("category_id", categoryId)
      .eq("is_goal", false)
      .order("display_order"),
    supabase
      .from("da_submissions")
      .select("id, participant_id, kind")
      .in("participant_id", participantIds)
      .eq("status", "completed")
      .is("archived_at", null),
  ]);

  const baselineSubs = (submissions ?? []).filter((s) => s.kind === "baseline");
  const retakeSubs = (submissions ?? []).filter((s) => s.kind === "retake");
  const baselineTotal = baselineSubs.length;
  const retakeTotal = retakeSubs.length;

  if (baselineTotal === 0) {
    return { title, baselineTotal: 0, retakeTotal: 0, sections: [] };
  }

  // Assumes at most one completed, non-archived submission of each kind
  // per participant — guaranteed by da_start_submission's resume/guard
  // logic (Session 2) and da_archive_and_restart (Session 1).
  const baselineByParticipant = new Map(baselineSubs.map((s) => [s.participant_id, s.id]));
  const retakeByParticipant = new Map(retakeSubs.map((s) => [s.participant_id, s.id]));

  const allSubmissionIds = [...baselineSubs, ...retakeSubs].map((s) => s.id);
  const { data: responses } = await supabase
    .from("da_responses")
    .select("submission_id, question_id, score")
    .in("submission_id", allSubmissionIds)
    .not("score", "is", null);

  const scoreBySubmissionQuestion = new Map<string, Map<string, number>>();
  for (const r of responses ?? []) {
    if (!scoreBySubmissionQuestion.has(r.submission_id)) {
      scoreBySubmissionQuestion.set(r.submission_id, new Map());
    }
    scoreBySubmissionQuestion.get(r.submission_id)!.set(r.question_id, r.score);
  }

  const sections: ReportSection[] = [];
  for (const q of questions ?? []) {
    const baselineScores: number[] = [];
    for (const subId of baselineByParticipant.values()) {
      const score = scoreBySubmissionQuestion.get(subId)?.get(q.id);
      if (score != null) baselineScores.push(score);
    }

    const retakeScores: number[] = [];
    for (const subId of retakeByParticipant.values()) {
      const score = scoreBySubmissionQuestion.get(subId)?.get(q.id);
      if (score != null) retakeScores.push(score);
    }

    const deltas: number[] = [];
    for (const [participantId, baselineSubId] of baselineByParticipant.entries()) {
      const retakeSubId = retakeByParticipant.get(participantId);
      if (!retakeSubId) continue;
      const baselineScore = scoreBySubmissionQuestion.get(baselineSubId)?.get(q.id);
      const retakeScore = scoreBySubmissionQuestion.get(retakeSubId)?.get(q.id);
      if (baselineScore != null && retakeScore != null) {
        deltas.push(retakeScore - baselineScore);
      }
    }

    const questionStat: ReportQuestionStat = {
      questionId: q.id,
      prompt: q.prompt,
      displayOrder: q.display_order,
      baseline: computeStatBlock(baselineScores, baselineTotal),
      retake: computeStatBlock(retakeScores, retakeTotal),
      growth: computeGrowthBlock(deltas),
    };

    const lastSection = sections[sections.length - 1];
    if (lastSection && lastSection.section === q.section) {
      lastSection.questions.push(questionStat);
    } else {
      sections.push({ section: q.section, questions: [questionStat] });
    }
  }

  return { title, baselineTotal, retakeTotal, sections };
}

// Anonymous goal texts for a set of participants (a single group), split by
// which sitting they were written at. Goals are stored as the goal
// question's response row (answer_text) — never with names attached here.
export async function fetchGoalsForParticipants(
  supabase: SupabaseClient,
  categoryId: string,
  participantIds: string[]
): Promise<{ goalsBaseline: string[]; goalsRetake: string[] }> {
  const empty = { goalsBaseline: [] as string[], goalsRetake: [] as string[] };
  if (participantIds.length === 0) return empty;

  const [{ data: submissions }, { data: goalQuestions }] = await Promise.all([
    supabase
      .from("da_submissions")
      .select("id, kind")
      .in("participant_id", participantIds)
      .eq("status", "completed")
      .is("archived_at", null),
    supabase.from("da_questions").select("id").eq("category_id", categoryId).eq("is_goal", true),
  ]);
  const submissionIds = (submissions ?? []).map((s) => s.id);
  const goalQuestionIds = (goalQuestions ?? []).map((q) => q.id);
  if (submissionIds.length === 0 || goalQuestionIds.length === 0) return empty;

  const { data: responses } = await supabase
    .from("da_responses")
    .select("submission_id, answer_text")
    .in("question_id", goalQuestionIds)
    .in("submission_id", submissionIds);

  const goalBySubmission = new Map<string, string>();
  for (const r of responses ?? []) {
    const text = r.answer_text?.trim();
    if (text) goalBySubmission.set(r.submission_id, text);
  }
  const pick = (kind: string) =>
    (submissions ?? [])
      .filter((s) => s.kind === kind && goalBySubmission.has(s.id))
      .map((s) => goalBySubmission.get(s.id)!);
  return { goalsBaseline: pick("baseline"), goalsRetake: pick("retake") };
}
