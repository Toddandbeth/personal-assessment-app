-- Discipleship Assessment — Session 2 fix: resuming a submission didn't
-- reload previously-saved answers into the question form. Adds a read
-- RPC scoped to one submission_id (an unguessable uuid, same trust model
-- as da_save_response already uses) so the client can pre-fill on resume.

create or replace function public.da_get_responses(p_submission_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('question_id', question_id, 'score', score, 'answer_text', answer_text)),
    '[]'::jsonb
  )
  from public.da_responses
  where submission_id = p_submission_id;
$$;

grant execute on function public.da_get_responses(uuid) to anon;
