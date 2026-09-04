// Hand-written types matching supabase/migrations/0001_init.sql and
// 0002_qa_flow.sql. Once this project is linked with the Supabase CLI,
// these can be regenerated with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts

export type Track = "group" | "standalone";
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
} as const;
