-- Discipleship Assessment — Session 2: question-answering + comparison
--
-- Adds read access to the (non-sensitive) reference tables and four new
-- RPCs for starting a submission, saving answers as the participant goes,
-- completing a submission, and fetching a baseline/retake comparison.
-- Identity/response tables (da_participants, da_submissions, da_responses)
-- stay fully closed — no anon grants — access is only through these RPCs,
-- same as 0001_init.sql's da_check_identity / da_archive_and_restart.
--
-- This migration does not touch any pre-existing, unrelated table.

-- ============================================================
-- REFERENCE DATA — safe to read directly (question text isn't
-- private, only participant identity and answers are).
-- ============================================================

create policy da_categories_select on public.da_categories for select using (true);
grant select on public.da_categories to anon;

create policy da_questions_select on public.da_questions for select using (true);
grant select on public.da_questions to anon;

-- ============================================================
-- RPCs
-- ============================================================

create or replace function public.da_start_submission(
  p_track text,
  p_group_label text,
  p_group_number text,
  p_standalone_category text,
  p_first_name text,
  p_last_four text,
  p_kind text,
  p_is_married boolean,
  p_has_children boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_label_id uuid;
  v_group_id uuid;
  v_category_id uuid;
  v_category_slug text;
  v_participant_id uuid;
  v_submission_id uuid;
  v_completed_count int;
begin
  if p_kind not in ('baseline', 'retake') then
    raise exception 'invalid kind';
  end if;

  if p_track = 'group' then
    select id, category_id into v_group_label_id, v_category_id
    from public.da_group_labels
    where label = trim(p_group_label);

    if v_group_label_id is null then
      raise exception 'group not found';
    end if;

    select id into v_group_id
    from public.da_groups
    where group_label_id = v_group_label_id
      and number = trim(p_group_number);

    if v_group_id is null then
      raise exception 'group not found';
    end if;
  else
    v_group_id := null;

    select id into v_category_id
    from public.da_categories
    where slug = p_standalone_category;

    if v_category_id is null then
      raise exception 'category not found';
    end if;
  end if;

  select slug into v_category_slug from public.da_categories where id = v_category_id;

  if v_group_id is not null then
    select id into v_participant_id
    from public.da_participants
    where group_id = v_group_id
      and first_name = trim(p_first_name)
      and last_four = trim(p_last_four);
  else
    select id into v_participant_id
    from public.da_participants
    where group_id is null
      and first_name = trim(p_first_name)
      and last_four = trim(p_last_four);
  end if;

  if v_participant_id is null then
    insert into public.da_participants (group_id, category_id, is_standalone, first_name, last_four)
    values (v_group_id, v_category_id, v_group_id is null, trim(p_first_name), trim(p_last_four))
    returning id into v_participant_id;
  end if;

  select count(*) into v_completed_count
  from public.da_submissions
  where participant_id = v_participant_id
    and status = 'completed'
    and archived_at is null;

  if p_kind = 'baseline' and v_completed_count > 0 then
    raise exception 'baseline already completed';
  end if;

  if p_kind = 'retake' and v_completed_count <> 1 then
    raise exception 'no baseline to retake';
  end if;

  -- resume an in-progress submission of this kind, if one exists
  select id into v_submission_id
  from public.da_submissions
  where participant_id = v_participant_id
    and kind = p_kind
    and status = 'in_progress'
    and archived_at is null;

  if v_submission_id is not null then
    update public.da_submissions
    set is_married = p_is_married, has_children = p_has_children
    where id = v_submission_id;
  else
    insert into public.da_submissions (participant_id, kind, status, is_married, has_children)
    values (v_participant_id, p_kind, 'in_progress', p_is_married, p_has_children)
    returning id into v_submission_id;
  end if;

  return jsonb_build_object('submission_id', v_submission_id, 'category', v_category_slug);
end;
$$;

grant execute on function public.da_start_submission(text, text, text, text, text, text, text, boolean, boolean) to anon;

create or replace function public.da_save_response(
  p_submission_id uuid,
  p_question_id uuid,
  p_score smallint,
  p_answer_text text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status from public.da_submissions where id = p_submission_id;

  if v_status is null then
    raise exception 'submission not found';
  end if;

  if v_status <> 'in_progress' then
    raise exception 'submission is not in progress';
  end if;

  insert into public.da_responses (submission_id, question_id, score, answer_text)
  values (p_submission_id, p_question_id, p_score, p_answer_text)
  on conflict (submission_id, question_id)
  do update set score = excluded.score, answer_text = excluded.answer_text;
end;
$$;

grant execute on function public.da_save_response(uuid, uuid, smallint, text) to anon;

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

  if v_status <> 'in_progress' then
    raise exception 'submission is not in progress';
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

create or replace function public.da_get_comparison(
  p_track text,
  p_group_label text,
  p_group_number text,
  p_standalone_category text,
  p_first_name text,
  p_last_four text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_label_id uuid;
  v_group_id uuid;
  v_category_id uuid;
  v_participant_id uuid;
  v_baseline_id uuid;
  v_retake_id uuid;
  v_result jsonb;
begin
  if p_track = 'group' then
    select id, category_id into v_group_label_id, v_category_id
    from public.da_group_labels
    where label = trim(p_group_label);

    if v_group_label_id is null then
      raise exception 'group not found';
    end if;

    select id into v_group_id
    from public.da_groups
    where group_label_id = v_group_label_id
      and number = trim(p_group_number);

    if v_group_id is null then
      raise exception 'group not found';
    end if;
  else
    v_group_id := null;

    select id into v_category_id
    from public.da_categories
    where slug = p_standalone_category;

    if v_category_id is null then
      raise exception 'category not found';
    end if;
  end if;

  if v_group_id is not null then
    select id into v_participant_id
    from public.da_participants
    where group_id = v_group_id
      and first_name = trim(p_first_name)
      and last_four = trim(p_last_four);
  else
    select id into v_participant_id
    from public.da_participants
    where group_id is null
      and first_name = trim(p_first_name)
      and last_four = trim(p_last_four);
  end if;

  if v_participant_id is null then
    raise exception 'participant not found';
  end if;

  select id into v_baseline_id
  from public.da_submissions
  where participant_id = v_participant_id
    and kind = 'baseline'
    and status = 'completed'
    and archived_at is null;

  select id into v_retake_id
  from public.da_submissions
  where participant_id = v_participant_id
    and kind = 'retake'
    and status = 'completed'
    and archived_at is null;

  if v_baseline_id is null or v_retake_id is null then
    raise exception 'completed pair not found';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'section', q.section,
      'prompt', q.prompt,
      'display_order', q.display_order,
      'baseline_score', br.score,
      'retake_score', rr.score
    )
    order by q.display_order
  )
  into v_result
  from public.da_questions q
  left join public.da_responses br on br.submission_id = v_baseline_id and br.question_id = q.id
  left join public.da_responses rr on rr.submission_id = v_retake_id and rr.question_id = q.id
  where q.is_goal = false
    and (br.id is not null or rr.id is not null);

  return jsonb_build_object('rows', coalesce(v_result, '[]'::jsonb));
end;
$$;

grant execute on function public.da_get_comparison(text, text, text, text, text, text) to anon;
