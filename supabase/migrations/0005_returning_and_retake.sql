-- Session 10: baseline-only results, "I'm returning" lookup, and retake
-- no-longer-re-asks married/has_children.
--
-- Three RPC changes, all create-or-replace (no signature/parameter renames,
-- so no drop-first needed like Session 7's region rename required):
--   1. da_get_comparison — only requires a completed baseline now, not a
--      full pair. The existing left join on the retake submission already
--      produces null retake_score values gracefully when there's no
--      retake, so nothing else in the query changes.
--   2. da_start_submission — for a retake, ignores the passed
--      p_is_married/p_has_children and instead inherits those values from
--      the participant's completed baseline, so the client never has to
--      ask again. Returns the effective is_married/has_children used, so
--      the client can filter conditional questions correctly either way.
--   3. da_find_returning (new) — looks up a participant by first name +
--      last four only, no region/group/category needed. Per the existing
--      security model, it never returns a raw participant/group id — only
--      the same human-readable fields (region name, group number,
--      standalone category slug) the normal entry form already collects,
--      so the client can immediately re-verify identity through the
--      existing da_check_identity exactly as if the person had typed
--      those fields in themselves.

create or replace function public.da_get_comparison(
  p_track text,
  p_region text,
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
  v_region_id uuid;
  v_group_id uuid;
  v_category_id uuid;
  v_participant_id uuid;
  v_baseline_id uuid;
  v_retake_id uuid;
  v_result jsonb;
begin
  if p_track = 'group' then
    select id, category_id into v_region_id, v_category_id
    from public.da_regions
    where name = trim(p_region);

    if v_region_id is null then
      raise exception 'group not found';
    end if;

    select id into v_group_id
    from public.da_groups
    where region_id = v_region_id
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

  -- Only a completed baseline is required now — a baseline-only result
  -- (no retake yet) is a valid, supported call, not an error.
  if v_baseline_id is null then
    raise exception 'no completed baseline';
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

create or replace function public.da_start_submission(
  p_track text,
  p_region text,
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
  v_region_id uuid;
  v_group_id uuid;
  v_category_id uuid;
  v_category_slug text;
  v_participant_id uuid;
  v_submission_id uuid;
  v_completed_count int;
  v_effective_is_married boolean;
  v_effective_has_children boolean;
begin
  if p_kind not in ('baseline', 'retake') then
    raise exception 'invalid kind';
  end if;

  if p_track = 'group' then
    select id, category_id into v_region_id, v_category_id
    from public.da_regions
    where name = trim(p_region);

    if v_region_id is null then
      raise exception 'group not found';
    end if;

    select id into v_group_id
    from public.da_groups
    where region_id = v_region_id
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

  -- Married/has_children is asked once, at baseline, and reused
  -- automatically for the retake — never re-asked, and never trusted from
  -- the client on a retake call even if passed.
  if p_kind = 'retake' then
    select is_married, has_children
    into v_effective_is_married, v_effective_has_children
    from public.da_submissions
    where participant_id = v_participant_id
      and kind = 'baseline'
      and status = 'completed'
      and archived_at is null
    limit 1;
  else
    v_effective_is_married := p_is_married;
    v_effective_has_children := p_has_children;
  end if;

  select id into v_submission_id
  from public.da_submissions
  where participant_id = v_participant_id
    and kind = p_kind
    and status = 'in_progress'
    and archived_at is null;

  if v_submission_id is not null then
    update public.da_submissions
    set is_married = v_effective_is_married, has_children = v_effective_has_children
    where id = v_submission_id;
  else
    insert into public.da_submissions (participant_id, kind, status, is_married, has_children)
    values (v_participant_id, p_kind, 'in_progress', v_effective_is_married, v_effective_has_children)
    returning id into v_submission_id;
  end if;

  return jsonb_build_object(
    'submission_id', v_submission_id,
    'category', v_category_slug,
    'is_married', v_effective_is_married,
    'has_children', v_effective_has_children
  );
end;
$$;

grant execute on function public.da_start_submission(text, text, text, text, text, text, text, boolean, boolean) to anon;

create or replace function public.da_find_returning(
  p_first_name text,
  p_last_four text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidates jsonb;
  v_count int;
begin
  select
    jsonb_agg(
      jsonb_build_object(
        'track', case when p.group_id is null then 'standalone' else 'group' end,
        'region', r.name,
        'group_number', g.number,
        'standalone_category', c.slug
      )
      order by coalesce(r.name, c.slug), g.number
    ),
    count(*)
  into v_candidates, v_count
  from public.da_participants p
  left join public.da_groups g on g.id = p.group_id
  left join public.da_regions r on r.id = g.region_id
  join public.da_categories c on c.id = p.category_id
  where p.first_name = trim(p_first_name)
    and p.last_four = trim(p_last_four);

  if v_count = 0 then
    return jsonb_build_object('status', 'not_found');
  elsif v_count = 1 then
    return jsonb_build_object('status', 'single') || (v_candidates -> 0);
  else
    return jsonb_build_object('status', 'multiple', 'candidates', v_candidates);
  end if;
end;
$$;

grant execute on function public.da_find_returning(text, text) to anon;
