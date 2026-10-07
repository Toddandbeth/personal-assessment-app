// Hand-written types matching supabase/migrations/0001_init.sql and
// 0002_qa_flow.sql. Once this project is linked with the Supabase CLI,
// these can be regenerated with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts

export type Track = "group" | "standalone";
// The home screen's three entry points. "returning" is purely a
// client-side routing concept — it's never sent to an RPC. Once
// da_find_returning resolves a candidate, its own track is always a plain
// Track ("group" or "standalone"), same as if the person had typed their
// Region/Group or picked a standalone category themselves.
export type EntryTrack = Track | "returning";
export type StandaloneCategory = "men" | "high_school";
export type SubmissionKind = "baseline" | "retake";
export type ConditionalFlag = "married" | "has_children" | "single";

export type IdentityStatus =
  | "group_not_found"
  | "first_time"
  | "retake"
  | "completed_pair";

export interface IdentityCheckResult {
  status: IdentityStatus;
  category: StandaloneCategory | null;
  goal_text: string | null;
}

export interface ReturningCandidate {
  track: Track;
  region: string | null;
  group_number: string | null;
  standalone_category: StandaloneCategory | null;
}

export type FindReturningResult =
  | { status: "not_found" }
  | ({ status: "single" } & ReturningCandidate)
  | { status: "multiple"; candidates: ReturningCandidate[] };

export interface Question {
  id: string;
  category_id: string;
  section: string;
  prompt: string;
  display_order: number;
  conditional_flag: ConditionalFlag | null;
  is_goal: boolean;
}

export interface StartSubmissionResult {
  submission_id: string;
  category: StandaloneCategory;
  is_married: boolean | null;
  has_children: boolean | null;
}

export interface ComparisonRow {
  section: string;
  prompt: string;
  display_order: number;
  baseline_score: number | null;
  retake_score: number | null;
}

export interface ComparisonResult {
  rows: ComparisonRow[];
  goal_baseline: string | null;
  goal_retake: string | null;
}

export interface ExistingResponse {
  question_id: string;
  score: number | null;
  answer_text: string | null;
}

export const RPC = {
  checkIdentity: "da_check_identity",
  archiveAndRestart: "da_archive_and_restart",
  startSubmission: "da_start_submission",
  saveResponse: "da_save_response",
  completeSubmission: "da_complete_submission",
  getComparison: "da_get_comparison",
  getResponses: "da_get_responses",
  findReturning: "da_find_returning",
} as const;
