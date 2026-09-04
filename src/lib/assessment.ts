import { createClient } from "@/lib/supabase/client";
import { toRpcArgs, type IdentityArgs } from "@/lib/identity";
import {
  RPC,
  type ComparisonResult,
  type ExistingResponse,
  type Question,
  type StartSubmissionResult,
  type SubmissionKind,
} from "@/lib/supabase/types";

export async function startSubmission(
  args: IdentityArgs,
  kind: SubmissionKind,
  isMarried: boolean | null,
  hasChildren: boolean | null
): Promise<StartSubmissionResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(RPC.startSubmission, {
    ...toRpcArgs(args),
    p_kind: kind,
    p_is_married: isMarried,
    p_has_children: hasChildren,
  });
  if (error) throw error;
  return data as StartSubmissionResult;
}

export async function saveResponse(
  submissionId: string,
  questionId: string,
  score: number | null,
  answerText: string | null
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc(RPC.saveResponse, {
    p_submission_id: submissionId,
    p_question_id: questionId,
    p_score: score,
    p_answer_text: answerText,
  });
  if (error) throw error;
}

export async function completeSubmission(submissionId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc(RPC.completeSubmission, {
    p_submission_id: submissionId,
  });
  if (error) throw error;
}

export async function getComparison(args: IdentityArgs): Promise<ComparisonResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(RPC.getComparison, toRpcArgs(args));
  if (error) throw error;
  return data as ComparisonResult;
}

export async function fetchExistingResponses(
  submissionId: string
): Promise<ExistingResponse[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(RPC.getResponses, {
    p_submission_id: submissionId,
  });
  if (error) throw error;
  return (data ?? []) as ExistingResponse[];
}

export async function fetchQuestions(categorySlug: string): Promise<Question[]> {
  const supabase = createClient();

  const { data: category, error: categoryError } = await supabase
    .from("da_categories")
    .select("id")
    .eq("slug", categorySlug)
    .single();
  if (categoryError) throw categoryError;

  const { data, error } = await supabase
    .from("da_questions")
    .select("id, category_id, section, prompt, display_order, conditional_flag, is_goal")
    .eq("category_id", category.id)
    .order("display_order");
  if (error) throw error;
  return (data ?? []) as Question[];
}
