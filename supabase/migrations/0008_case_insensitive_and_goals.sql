-- Session 11
--
-- 1. Case-insensitive matching. da_regions.name, da_groups.number and
--    da_participants.first_name are citext, but every RPC compared them
--    with `= trim(p_x)`. trim() returns plain text, and Postgres resolves
--    `citext = text` by casting the citext side DOWN to text — an ordinary
--    case-sensitive comparison, silently bypassing the citext type. Casting
--    the parameter side to citext (`trim(p_x)::citext`) keeps the comparison
--    case-insensitive as the spec intends. Bodies are otherwise unchanged.
--
-- 2. Goals. The app saves a participant's goal as a da_responses row
--    (answer_text on the goal question); da_submissions.goal_text is never
--    written by the app. da_check_identity and da_get_comparison now read the
--    goal from the response row (check_identity falls back to the legacy
--    column so seeded data still works).

create or replace function public.da_check_identity(
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
  v_category_slug text;
  v_participant_id uuid;
  v_completed_count int;
  v_goal_text text;
begin
  if p_track = 'group' then
    select id, category_id into v_region_id, v_category_id
    from public.da_regions
    where name = trim(p_region)::citext;

    if v_region_id is null then
      return jsonb_build_object('status', 'group_not_found', 'category', null, 'goal_text', null);
    end if;

    select id into v_group_id
    from public.da_groups
    where region_id = v_region_id
      and number = trim(p_group_number)::citext;

    if v_group_id is null then
      return jsonb_build_object('status', 'group_not_found', 'category', null, 'goal_text', null);
    end if;

    select id into v_participant_id
    from public.da_participants
    where group_id = v_group_id
      and first_name = trim(p_first_name)::citext
      and last_four = trim(p_last_four);
  else
    v_group_id := null;

    select id, category_id into v_participant_id, v_category_id
    from public.da_participants
    where group_id is null
      and first_name = trim(p_first_name)::citext
      and last_four = trim(p_last_four);

    if v_category_id is null then
      select id into v_category_id
      from public.da_categories
      where slug = p_standalone_category;

      if v_category_id is null then
        return jsonb_build_object('status', 'group_not_found', 'category', null, 'goal_text', null);
      end if;
    end if;
  end if;

  select slug into v_category_slug from public.da_categories where id = v_category_id;

  if v_participant_id is null then
    return jsonb_build_object('status', 'first_time', 'category', v_category_slug, 'goal_text', null);
  end if;

  select count(*) into v_completed_count
  from public.da_submissions
  where participant_id = v_participant_id
    and status = 'completed'
    and archived_at is null;

  if v_completed_count = 0 then
    return jsonb_build_object('status', 'first_time', 'category', v_category_slug, 'goal_text', null);
  elsif v_completed_count = 1 then
    select coalesce(
      (select nullif(trim(r.answer_text), '')
         from public.da_responses r
         join public.da_questions q on q.id = r.question_id and q.is_goal
        where r.submission_id = s.id),
      s.goal_text
    )
    into v_goal_text
    from public.da_submissions s
    where s.participant_id = v_participant_id
      and s.status = 'completed'
      and s.archived_at is null
      and s.kind = 'baseline'
    limit 1;

    return jsonb_build_object('status', 'retake', 'category', v_category_slug, 'goal_text', v_goal_text);
  else
    return jsonb_build_object('status', 'completed_pair', 'category', v_category_slug, 'goal_text', null);
  end if;
end;
$$;

grant execute on function public.da_check_identity(text, text, text, text, text, text) to anon;

create or replace function public.da_archive_and_restart(
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
  v_category_slug text;
  v_participant_id uuid;
  v_completed_count int;
begin
  if p_track = 'group' then
    select id, category_id into v_region_id, v_category_id
    from public.da_regions
    where name = trim(p_region)::citext;

    if v_region_id is null then
      raise exception 'group not found';
    end if;

    select id into v_group_id
    from public.da_groups
    where region_id = v_region_id
      and number = trim(p_group_number)::citext;

    if v_group_id is null then
      raise exception 'group not found';
    end if;

    select id into v_participant_id
    from public.da_participants
    where group_id = v_group_id
      and first_name = trim(p_first_name)::citext
      and last_four = trim(p_last_four);
  else
    v_group_id := null;

    select id, category_id into v_participant_id, v_category_id
    from public.da_participants
    where group_id is null
      and first_name = trim(p_first_name)::citext
      and last_four = trim(p_last_four);

    if v_category_id is null then
      select id into v_category_id
      from public.da_categories
      where slug = p_standalone_category;

      if v_category_id is null then
        raise exception 'category not found';
      end if;
    end if;
  end if;

  select slug into v_category_slug from public.da_categories where id = v_category_id;

  if v_participant_id is null then
    raise exception 'participant not found';
  end if;

  select count(*) into v_completed_count
  from public.da_submissions
  where participant_id = v_participant_id
    and status = 'completed'
    and archived_at is null;

  if v_completed_count < 2 then
    raise exception 'no completed pair to archive';
  end if;

  update public.da_submissions
  set archived_at = now()
  where participant_id = v_participant_id
    and archived_at is null;

  return jsonb_build_object('status', 'first_time', 'category', v_category_slug, 'goal_text', null);
end;
$$;

grant execute on function public.da_archive_and_restart(text, text, text, text, text, text) to anon;

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
    where name = trim(p_region)::citext;

    if v_region_id is null then
      raise exception 'group not found';
    end if;

    select id into v_group_id
    from public.da_groups
    where region_id = v_region_id
      and number = trim(p_group_number)::citext;

    if v_group_id is null then
      raise exception 'group not found';
    end if;

    select id into v_participant_id
    from public.da_participants
    where group_id = v_group_id
      and first_name = trim(p_first_name)::citext
      and last_four = trim(p_last_four);
  else
    v_group_id := null;

    select id, category_id into v_participant_id, v_category_id
    from public.da_participants
    where group_id is null
      and first_name = trim(p_first_name)::citext
      and last_four = trim(p_last_four);

    if v_category_id is null then
      select id into v_category_id
      from public.da_categories
      where slug = p_standalone_category;

      if v_category_id is null then
        raise exception 'category not found';
      end if;
    end if;
  end if;

  select slug into v_category_slug from public.da_categories where id = v_category_id;

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
  v_goal_baseline text;
  v_goal_retake text;
begin
  if p_track = 'group' then
    select id, category_id into v_region_id, v_category_id
    from public.da_regions
    where name = trim(p_region)::citext;

    if v_region_id is null then
      raise exception 'group not found';
    end if;

    select id into v_group_id
    from public.da_groups
    where region_id = v_region_id
      and number = trim(p_group_number)::citext;

    if v_group_id is null then
      raise exception 'group not found';
    end if;

    select id into v_participant_id
    from public.da_participants
    where group_id = v_group_id
      and first_name = trim(p_first_name)::citext
      and last_four = trim(p_last_four);
  else
    v_group_id := null;

    select id, category_id into v_participant_id, v_category_id
    from public.da_participants
    where group_id is null
      and first_name = trim(p_first_name)::citext
      and last_four = trim(p_last_four);

    if v_category_id is null then
      select id into v_category_id
      from public.da_categories
      where slug = p_standalone_category;

      if v_category_id is null then
        raise exception 'category not found';
      end if;
    end if;
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

  select nullif(trim(r.answer_text), '') into v_goal_baseline
  from public.da_responses r
  join public.da_questions q on q.id = r.question_id and q.is_goal
  where r.submission_id = v_baseline_id;

  if v_retake_id is not null then
    select nullif(trim(r.answer_text), '') into v_goal_retake
    from public.da_responses r
    join public.da_questions q on q.id = r.question_id and q.is_goal
    where r.submission_id = v_retake_id;
  end if;

  return jsonb_build_object(
    'rows', coalesce(v_result, '[]'::jsonb),
    'goal_baseline', v_goal_baseline,
    'goal_retake', v_goal_retake
  );
end;
$$;

grant execute on function public.da_get_comparison(text, text, text, text, text, text) to anon;

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
      order by coalesce(r.name, c.slug::citext), g.number
    ),
    count(*)
  into v_candidates, v_count
  from public.da_participants p
  left join public.da_groups g on g.id = p.group_id
  left join public.da_regions r on r.id = g.region_id
  join public.da_categories c on c.id = p.category_id
  where p.first_name = trim(p_first_name)::citext
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
