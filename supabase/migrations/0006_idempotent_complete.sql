-- Fix: da_complete_submission was throwing "submission is not in progress"
-- whenever it was called on a submission that had already been completed.
-- da_submissions.status only has two possible values (in_progress,
-- completed, enforced by a check constraint), so that branch could only
-- ever mean "already completed" — never a real error. In practice this
-- fired on an accidental double-tap of "Confirm & Submit" (easy to do on
-- mobile): the first tap genuinely completes and saves everything
-- correctly, and the second tap hits this guard and surfaces a scary
-- "something went wrong" error to someone whose assessment actually saved
-- just fine.
--
-- Fix: completing an already-completed submission is now a harmless no-op
-- that returns the same success shape, instead of an error. Every other
-- guard (submission not found, not all required questions answered) is
-- unchanged.

create or replace function public.da_complete_submission(p_submission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_category_id uuid;
  v_is_married boolean;
  v_has_children boolean;
  v_missing_count int;
begin
  select s.status, s.is_married, s.has_children, p.category_id
  into v_status, v_is_married, v_has_children, v_category_id
  from public.da_submissions s
  join public.da_participants p on p.id = s.participant_id
  where s.id = p_submission_id;

  if v_status is null then
    raise exception 'submission not found';
  end if;

  -- Already completed (e.g. a double-tap on submit) — nothing to do, and
  -- nothing wrong. Return success rather than erroring.
  if v_status = 'completed' then
    return jsonb_build_object('status', 'completed');
  end if;

  select count(*) into v_missing_count
  from public.da_questions q
  where q.category_id = v_category_id
    and q.is_goal = false
    and (
      q.conditional_flag is null
      or (q.conditional_flag = 'married' and v_is_married is true)
      or (q.conditional_flag = 'has_children' and v_has_children is true)
      or (q.conditional_flag = 'single' and v_is_married is false)
    )
    and not exists (
      select 1 from public.da_responses r
      where r.submission_id = p_submission_id
        and r.question_id = q.id
        and r.score is not null
    );

  if v_missing_count > 0 then
    raise exception 'not all required questions are answered';
  end if;

  update public.da_submissions
  set status = 'completed', completed_at = now()
  where id = p_submission_id;

  return jsonb_build_object('status', 'completed');
end;
$$;

grant execute on function public.da_complete_submission(uuid) to anon;
