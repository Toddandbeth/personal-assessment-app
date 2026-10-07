-- Session 12, migration 1 of 2: two front doors, PIN, attempt limits.
--
-- Safe to run more than once. Touches only da_ tables/functions.
--
--  * "door" tag (fullcount | intentionalministries) on participants,
--    submissions and responses. Every existing row becomes fullcount.
--  * Intentional Ministries (IM) people have a 4-digit PIN, stored only as a
--    salted bcrypt hash (never readable by the browser: da_participants has
--    no anon access). IM people are always standalone and always use the
--    shared adult ("men") question list.
--  * Identity for IM = first name + last four + PIN. Two strangers with the
--    same name and number but different PINs are two separate people, and
--    nothing ever reveals that another person exists.
--  * Failed/unmatched IM lookups are counted per name+number in
--    da_auth_attempts; 8 in 15 minutes locks that name+number for 15
--    minutes, with the same generic error whether or not the person exists.
--    The same table also backs the admin login limits (used by the server).
--  * Every lookup function now takes p_door and p_pin (defaulted, so the
--    currently deployed Full Count app keeps working until the new code is
--    deployed). Full Count lookups only ever see Full Count people.

create extension if not exists pgcrypto with schema extensions;

-- ============================================================
-- Door tags + PIN column
-- ============================================================

alter table public.da_participants
  add column if not exists door text not null default 'fullcount',
  add column if not exists pin_hash text;
alter table public.da_submissions
  add column if not exists door text not null default 'fullcount';
alter table public.da_responses
  add column if not exists door text not null default 'fullcount';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'da_participants_door_check') then
    alter table public.da_participants
      add constraint da_participants_door_check
      check (door in ('fullcount', 'intentionalministries'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'da_submissions_door_check') then
    alter table public.da_submissions
      add constraint da_submissions_door_check
      check (door in ('fullcount', 'intentionalministries'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'da_responses_door_check') then
    alter table public.da_responses
      add constraint da_responses_door_check
      check (door in ('fullcount', 'intentionalministries'));
  end if;
  -- IM people: never in a group, always have a PIN.
  if not exists (select 1 from pg_constraint where conname = 'da_participants_im_shape_check') then
    alter table public.da_participants
      add constraint da_participants_im_shape_check
      check (door = 'fullcount' or (group_id is null and pin_hash is not null));
  end if;
end $$;

-- Uniqueness is now per door. Full Count keeps "one standalone person per
-- name + last four". IM deliberately has NO such rule: the same name+number
-- with different PINs are different people (enforced inside the functions).
drop index if exists public.da_participants_standalone_identity_uidx;
create unique index if not exists da_participants_fc_standalone_identity_uidx
  on public.da_participants (first_name, last_four)
  where group_id is null and door = 'fullcount';

create index if not exists da_participants_im_lookup_idx
  on public.da_participants (first_name, last_four)
  where door = 'intentionalministries';

-- ============================================================
-- Attempt limiting (works on serverless; counts live in the database)
-- ============================================================

create table if not exists public.da_auth_attempts (
  key text primary key,
  fail_count int not null default 0,
  window_started timestamptz not null default now(),
  locked_until timestamptz
);
alter table public.da_auth_attempts enable row level security;
revoke all on public.da_auth_attempts from anon, authenticated;

create or replace function public.da_attempt_check(p_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_locked timestamptz;
begin
  select locked_until into v_locked from public.da_auth_attempts where key = p_key;
  if v_locked is not null and v_locked > now() then
    raise exception 'too_many_attempts';
  end if;
end;
$$;

create or replace function public.da_attempt_fail(
  p_key text,
  p_max int,
  p_window interval,
  p_lock interval
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.da_auth_attempts as a (key, fail_count, window_started)
  values (p_key, 1, now())
  on conflict (key) do update
    set fail_count = case when a.window_started < now() - p_window then 1 else a.fail_count + 1 end,
        window_started = case when a.window_started < now() - p_window then now() else a.window_started end
  returning fail_count into v_count;

  if v_count >= p_max then
    update public.da_auth_attempts set locked_until = now() + p_lock where key = p_key;
  end if;
end;
$$;

create or replace function public.da_attempt_ok(p_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.da_auth_attempts where key = p_key;
end;
$$;

-- Only the server (service role) may call these directly. The PIN functions
-- below call them internally as the function owner.
revoke all on function public.da_attempt_check(text) from public, anon, authenticated;
revoke all on function public.da_attempt_fail(text, int, interval, interval) from public, anon, authenticated;
revoke all on function public.da_attempt_ok(text) from public, anon, authenticated;
grant execute on function public.da_attempt_check(text) to service_role;
grant execute on function public.da_attempt_fail(text, int, interval, interval) to service_role;
grant execute on function public.da_attempt_ok(text) to service_role;

-- ============================================================
-- IM participant lookup: name + last four + PIN -> participant id (or null)
-- ============================================================

create or replace function public.da_im_find_participant(
  p_first_name text,
  p_last_four text,
  p_pin text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_key text;
  v_id uuid;
begin
  v_key := 'pin:' || encode(
    digest(lower(trim(p_first_name)) || '|' || trim(p_last_four), 'sha256'), 'hex');

  perform public.da_attempt_check(v_key);

  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    perform public.da_attempt_fail(v_key, 8, interval '15 minutes', interval '15 minutes');
    return null;
  end if;

  select id into v_id
  from public.da_participants
  where door = 'intentionalministries'
    and first_name = trim(p_first_name)::citext
    and last_four = trim(p_last_four)
    and pin_hash = crypt(p_pin, pin_hash)
  limit 1;

  if v_id is null then
    perform public.da_attempt_fail(v_key, 8, interval '15 minutes', interval '15 minutes');
  else
    perform public.da_attempt_ok(v_key);
  end if;

  return v_id;
end;
$$;

revoke all on function public.da_im_find_participant(text, text, text) from public, anon, authenticated;

-- ============================================================
-- Lookup functions: door + PIN aware
-- ============================================================

drop function if exists public.da_check_identity(text, text, text, text, text, text);
drop function if exists public.da_archive_and_restart(text, text, text, text, text, text);
drop function if exists public.da_start_submission(text, text, text, text, text, text, text, boolean, boolean);
drop function if exists public.da_get_comparison(text, text, text, text, text, text);

create or replace function public.da_check_identity(
  p_track text,
  p_region text,
  p_group_number text,
  p_standalone_category text,
  p_first_name text,
  p_last_four text,
  p_door text default 'fullcount',
  p_pin text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_door text := coalesce(p_door, 'fullcount');
  v_region_id uuid;
  v_group_id uuid;
  v_category_id uuid;
  v_category_slug text;
  v_participant_id uuid;
  v_completed_count int;
  v_goal_text text;
begin
  if v_door not in ('fullcount', 'intentionalministries') then
    raise exception 'invalid door';
  end if;

  if v_door = 'intentionalministries' then
    v_group_id := null;
    select id into v_category_id from public.da_categories where slug = 'men';
    v_participant_id := public.da_im_find_participant(p_first_name, p_last_four, p_pin);
  elsif p_track = 'group' then
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
      and door = 'fullcount'
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

grant execute on function public.da_check_identity(text, text, text, text, text, text, text, text) to anon;

create or replace function public.da_archive_and_restart(
  p_track text,
  p_region text,
  p_group_number text,
  p_standalone_category text,
  p_first_name text,
  p_last_four text,
  p_door text default 'fullcount',
  p_pin text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_door text := coalesce(p_door, 'fullcount');
  v_region_id uuid;
  v_group_id uuid;
  v_category_id uuid;
  v_category_slug text;
  v_participant_id uuid;
  v_completed_count int;
begin
  if v_door not in ('fullcount', 'intentionalministries') then
    raise exception 'invalid door';
  end if;

  if v_door = 'intentionalministries' then
    v_group_id := null;
    select id into v_category_id from public.da_categories where slug = 'men';
    v_participant_id := public.da_im_find_participant(p_first_name, p_last_four, p_pin);
  elsif p_track = 'group' then
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
      and door = 'fullcount'
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

grant execute on function public.da_archive_and_restart(text, text, text, text, text, text, text, text) to anon;

create or replace function public.da_start_submission(
  p_track text,
  p_region text,
  p_group_number text,
  p_standalone_category text,
  p_first_name text,
  p_last_four text,
  p_kind text,
  p_is_married boolean,
  p_has_children boolean,
  p_door text default 'fullcount',
  p_pin text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_door text := coalesce(p_door, 'fullcount');
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
  if v_door not in ('fullcount', 'intentionalministries') then
    raise exception 'invalid door';
  end if;

  if p_kind not in ('baseline', 'retake') then
    raise exception 'invalid kind';
  end if;

  if v_door = 'intentionalministries' then
    v_group_id := null;
    select id into v_category_id from public.da_categories where slug = 'men';
    -- Serialize concurrent starts for the same name+number so two taps
    -- can't create duplicate people.
    perform pg_advisory_xact_lock(
      hashtext('im:' || lower(trim(p_first_name)) || '|' || trim(p_last_four)));
    v_participant_id := public.da_im_find_participant(p_first_name, p_last_four, p_pin);
  elsif p_track = 'group' then
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
      and door = 'fullcount'
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
    if v_door = 'intentionalministries' then
      if p_pin is null or p_pin !~ '^[0-9]{4}$' then
        raise exception 'invalid pin';
      end if;
      insert into public.da_participants
        (group_id, category_id, is_standalone, first_name, last_four, door, pin_hash)
      values
        (null, v_category_id, true, trim(p_first_name), trim(p_last_four),
         'intentionalministries', crypt(p_pin, gen_salt('bf', 8)))
      returning id into v_participant_id;
    else
      insert into public.da_participants (group_id, category_id, is_standalone, first_name, last_four, door)
      values (v_group_id, v_category_id, v_group_id is null, trim(p_first_name), trim(p_last_four), 'fullcount')
      returning id into v_participant_id;
    end if;
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
    insert into public.da_submissions (participant_id, kind, status, is_married, has_children, door)
    values (v_participant_id, p_kind, 'in_progress', v_effective_is_married, v_effective_has_children, v_door)
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

grant execute on function public.da_start_submission(text, text, text, text, text, text, text, boolean, boolean, text, text) to anon;

create or replace function public.da_get_comparison(
  p_track text,
  p_region text,
  p_group_number text,
  p_standalone_category text,
  p_first_name text,
  p_last_four text,
  p_door text default 'fullcount',
  p_pin text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_door text := coalesce(p_door, 'fullcount');
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
  if v_door not in ('fullcount', 'intentionalministries') then
    raise exception 'invalid door';
  end if;

  if v_door = 'intentionalministries' then
    v_group_id := null;
    select id into v_category_id from public.da_categories where slug = 'men';
    v_participant_id := public.da_im_find_participant(p_first_name, p_last_four, p_pin);
  elsif p_track = 'group' then
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
      and door = 'fullcount'
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

  -- Only the questions this person actually answered appear (so someone who
  -- took an older question list never sees questions from a list they
  -- didn't take, and vice versa).
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

grant execute on function public.da_get_comparison(text, text, text, text, text, text, text, text) to anon;

-- Full Count "I'm returning" lookup: Full Count people only. (IM never uses
-- this; it asks for name + last four + PIN and goes straight to
-- da_check_identity.)
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
  where p.door = 'fullcount'
    and p.first_name = trim(p_first_name)::citext
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

-- Saving an answer stamps the response with the submission's door.
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
  v_door text;
begin
  select status, door into v_status, v_door from public.da_submissions where id = p_submission_id;

  if v_status is null then
    raise exception 'submission not found';
  end if;

  if v_status <> 'in_progress' then
    raise exception 'submission is not in progress';
  end if;

  insert into public.da_responses (submission_id, question_id, score, answer_text, door)
  values (p_submission_id, p_question_id, p_score, p_answer_text, v_door)
  on conflict (submission_id, question_id)
  do update set score = excluded.score, answer_text = excluded.answer_text;
end;
$$;

grant execute on function public.da_save_response(uuid, uuid, smallint, text) to anon;

-- Existing submissions/responses inherit their participant's door (all
-- existing rows are fullcount already via the column default; this keeps the
-- tags consistent if the migration is re-run later).
update public.da_submissions s set door = p.door
  from public.da_participants p where p.id = s.participant_id and s.door <> p.door;
update public.da_responses r set door = s.door
  from public.da_submissions s where s.id = r.submission_id and r.door <> s.door;
