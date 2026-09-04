-- Session 7: rename "Group Label" -> "Region" everywhere, and add a real
-- Ministry level above Category (Ministry > Category > Region > Group).
--
-- The rename is lossless: ALTER TABLE/COLUMN RENAME operates on the
-- object's internal OID, not its name, so every row, index, foreign key,
-- and RLS policy stays attached automatically. Nothing is dropped or
-- recreated.

-- ============================================================
-- RENAME: da_group_labels -> da_regions, label -> name,
-- da_groups.group_label_id -> region_id
--
-- Each rename is guarded so this whole file is safe to re-run if an
-- earlier attempt got partway through before failing.
-- ============================================================

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'da_group_labels'
  ) then
    alter table public.da_group_labels rename to da_regions;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'da_regions' and column_name = 'label'
  ) then
    alter table public.da_regions rename column label to name;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'da_groups' and column_name = 'group_label_id'
  ) then
    alter table public.da_groups rename column group_label_id to region_id;
  end if;
end $$;

-- ============================================================
-- NEW: Ministry (Ministry > Category > Region > Group). Single
-- hardcoded row for now, no admin UI to add more (deferred, per
-- spec Section 10). Fully closed to anon, same as every other
-- admin-only table.
-- ============================================================

create table if not exists public.da_ministries (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.da_ministries enable row level security;

insert into public.da_ministries (name) values ('Full Count')
on conflict (name) do nothing;

alter table public.da_categories
  add column if not exists ministry_id uuid references public.da_ministries (id);

update public.da_categories
set ministry_id = (select id from public.da_ministries where name = 'Full Count')
where ministry_id is null;

alter table public.da_categories
  alter column ministry_id set not null;

-- ============================================================
-- RPCs — same logic as before, updated to the renamed table/column,
-- and p_group_label -> p_region for the parameter name.
--
-- CREATE OR REPLACE can't rename an input parameter while keeping the
-- same signature (Postgres error 42P13), so each function below is
-- dropped first, then recreated. Dropping a function doesn't touch any
-- data — only its own definition and grants, both of which are
-- immediately restored here.
-- ============================================================

drop function if exists public.da_check_identity(text, text, text, text, text, text);

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
    where name = trim(p_region);

    if v_region_id is null then
      return jsonb_build_object('status', 'group_not_found', 'category', null, 'goal_text', null);
    end if;

    select id into v_group_id
    from public.da_groups
    where region_id = v_region_id
      and number = trim(p_group_number);

    if v_group_id is null then
      return jsonb_build_object('status', 'group_not_found', 'category', null, 'goal_text', null);
    end if;
  else
    v_group_id := null;

    select id into v_category_id
    from public.da_categories
    where slug = p_standalone_category;

    if v_category_id is null then
      return jsonb_build_object('status', 'group_not_found', 'category', null, 'goal_text', null);
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
    select goal_text into v_goal_text
    from public.da_submissions
    where participant_id = v_participant_id
      and status = 'completed'
      and archived_at is null
      and kind = 'baseline'
    limit 1;

    return jsonb_build_object('status', 'retake', 'category', v_category_slug, 'goal_text', v_goal_text);
  else
    return jsonb_build_object('status', 'completed_pair', 'category', v_category_slug, 'goal_text', null);
  end if;
end;
$$;

grant execute on function public.da_check_identity(text, text, text, text, text, text) to anon;

drop function if exists public.da_archive_and_restart(text, text, text, text, text, text);

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

drop function if exists public.da_start_submission(text, text, text, text, text, text, text, boolean, boolean);

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

drop function if exists public.da_get_comparison(text, text, text, text, text, text);

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
