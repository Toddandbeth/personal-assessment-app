-- Discipleship Assessment — initial schema
--
-- This project SHARES a Supabase project with an existing, unrelated app
-- (a marriage assessment). Every object created here is prefixed `da_`
-- (Discipleship Assessment) so it can never collide with, and never needs
-- to touch, that other app's tables. This migration does not ALTER, GRANT
-- on, or otherwise reference any pre-existing table.
--
-- Security model: there are no participant accounts (identity is a typed
-- code, not a login). RLS is enabled on every da_ table with NO policies
-- granted to anon — all reads/writes go through two SECURITY DEFINER RPCs
-- (da_check_identity, da_archive_and_restart) which resolve identity
-- server-side and never return raw rows or UUIDs to the browser.

create extension if not exists citext;
create extension if not exists pgcrypto;

-- ============================================================
-- TABLES
-- ============================================================

create table public.da_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.da_group_labels (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.da_categories (id),
  label citext not null unique,
  created_at timestamptz not null default now()
);

create table public.da_groups (
  id uuid primary key default gen_random_uuid(),
  group_label_id uuid not null references public.da_group_labels (id),
  number citext not null,
  created_at timestamptz not null default now(),
  unique (group_label_id, number)
);

create table public.da_participants (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.da_groups (id), -- null for standalone/General track
  category_id uuid not null references public.da_categories (id),
  is_standalone boolean not null default false,
  first_name citext not null,
  last_four text not null check (last_four ~ '^[0-9]{4}$'),
  created_at timestamptz not null default now()
);

-- Two partial unique indexes since group_id is null for the standalone
-- track (Postgres treats NULLs as distinct in a plain unique constraint,
-- which would silently allow duplicate standalone identities otherwise).
create unique index da_participants_group_identity_uidx
  on public.da_participants (group_id, first_name, last_four)
  where group_id is not null;

create unique index da_participants_standalone_identity_uidx
  on public.da_participants (first_name, last_four)
  where group_id is null;

create table public.da_submissions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.da_participants (id),
  kind text not null check (kind in ('baseline', 'retake')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  is_married boolean, -- collected during Q&A (Phase 2), drives Marriage/Single sections
  has_children boolean, -- collected during Q&A (Phase 2), drives Family section
  goal_text text, -- private free-text goal; never included in any report
  archived_at timestamptz, -- set by da_archive_and_restart when a completed pair is superseded
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index da_submissions_participant_idx on public.da_submissions (participant_id);

create table public.da_questions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.da_categories (id),
  section text not null,
  prompt text not null,
  display_order int not null,
  conditional_flag text check (conditional_flag in ('married', 'has_children', 'single')),
  is_goal boolean not null default false,
  created_at timestamptz not null default now()
);

create index da_questions_category_order_idx on public.da_questions (category_id, display_order);

create table public.da_responses (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.da_submissions (id),
  question_id uuid not null references public.da_questions (id),
  score smallint check (score between 1 and 5),
  answer_text text, -- used for the Goal "question" instead of score
  created_at timestamptz not null default now(),
  unique (submission_id, question_id)
);

-- ============================================================
-- ROW LEVEL SECURITY — deny by default, no anon policies on any
-- table; access is only through the SECURITY DEFINER RPCs below.
-- ============================================================

alter table public.da_categories enable row level security;
alter table public.da_group_labels enable row level security;
alter table public.da_groups enable row level security;
alter table public.da_participants enable row level security;
alter table public.da_submissions enable row level security;
alter table public.da_questions enable row level security;
alter table public.da_responses enable row level security;

-- ============================================================
-- RPCs
-- ============================================================

create or replace function public.da_check_identity(
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
  v_category_slug text;
  v_participant_id uuid;
  v_completed_count int;
  v_goal_text text;
begin
  if p_track = 'group' then
    select id, category_id into v_group_label_id, v_category_id
    from public.da_group_labels
    where label = trim(p_group_label);

    if v_group_label_id is null then
      return jsonb_build_object('status', 'group_not_found', 'category', null, 'goal_text', null);
    end if;

    select id into v_group_id
    from public.da_groups
    where group_label_id = v_group_label_id
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

create or replace function public.da_archive_and_restart(
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
  v_category_slug text;
  v_participant_id uuid;
  v_completed_count int;
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

-- ============================================================
-- SEED DATA — categories (Section 3) and question sets (Section 5)
-- ============================================================

insert into public.da_categories (slug, name) values
  ('men', 'Men'),
  ('high_school', 'High School');

-- 5A. Men's Assessment — Final List (30 questions + Goal)
insert into public.da_questions (category_id, section, prompt, display_order, conditional_flag, is_goal)
select id, v.section, v.prompt, v.display_order, v.conditional_flag, v.is_goal
from public.da_categories, (values
  ('Spiritual Disciplines', 'Do you read the Bible daily?', 1, null, false),
  ('Spiritual Disciplines', 'Do you have a daily prayer time?', 2, null, false),
  ('Spiritual Disciplines', 'Do you memorize scripture?', 3, null, false),
  ('Spiritual Disciplines', 'Do you regularly fast?', 4, null, false),
  ('Spiritual Disciplines', 'Do you regularly journal?', 5, null, false),
  ('Spiritual Disciplines', 'Do you give generously? (tithe)', 6, null, false),
  ('Spiritual Disciplines', 'Are you regularly involved (attending) in a local church?', 7, null, false),
  ('Community and Accountability', 'Do you regularly meet with other believers?', 8, null, false),
  ('Community and Accountability', 'Are you in an accountable relationship?', 9, null, false),
  ('Outward-Facing Faith', 'Do you know how to share your faith with others?', 10, null, false),
  ('Outward-Facing Faith', 'Are you intentional about investing in those around you?', 11, null, false),
  ('Outward-Facing Faith', 'Do you give of your time (serve) at a local church or ministry?', 12, null, false),
  ('Personal Holiness', 'Are you disciplining yourself for godliness?', 13, null, false),
  ('Personal Holiness', 'How would you rate the health of your social media habits?', 14, null, false),
  ('Personal Holiness', 'Rate your purity (what you watch or look at, thought life)', 15, null, false),
  ('Personal Holiness', 'How well do you control or manage your anger?', 16, null, false),
  ('Time and Financial Stewardship', 'Do you manage your time well?', 17, null, false),
  ('Time and Financial Stewardship', 'How is your financial health (consumer debt, budget, savings)?', 18, null, false),
  ('Marriage', 'Do you pray with your spouse regularly?', 19, 'married', false),
  ('Marriage', 'Do you put your spouse''s needs above your own?', 20, 'married', false),
  ('Marriage', 'Do you regularly go on dates with your spouse?', 21, 'married', false),
  ('Marriage', 'Are you leading your family spiritually?', 22, 'married', false),
  ('Family', 'Are you patient with your family?', 23, 'has_children', false),
  ('Family', 'Are you spending quality time with your family?', 24, 'has_children', false),
  ('Family', 'Are you intentional in discipling your children?', 25, 'has_children', false),
  ('Single', 'Do you practice purity in your dating relationships?', 26, 'single', false),
  ('Single', 'Are you intentional about who you date, rather than dating without direction or purpose?', 27, 'single', false),
  ('Single', 'Do you have a clear understanding of what you''re looking for in a future spouse?', 28, 'single', false),
  ('Physical Health', 'Do you eat healthy?', 29, null, false),
  ('Physical Health', 'Do you regularly exercise?', 30, null, false),
  ('Goal', 'What is one goal you want to work toward this year?', 31, null, true)
) as v(section, prompt, display_order, conditional_flag, is_goal)
where da_categories.slug = 'men';

-- 5B. High School Assessment — Final List (28 questions + Goal, no conditional sections)
insert into public.da_questions (category_id, section, prompt, display_order, conditional_flag, is_goal)
select id, v.section, v.prompt, v.display_order, v.conditional_flag, v.is_goal
from public.da_categories, (values
  ('Spiritual Disciplines', 'Do you read the Bible daily?', 1, null, false),
  ('Spiritual Disciplines', 'Do you have a daily prayer time?', 2, null, false),
  ('Spiritual Disciplines', 'Do you memorize scripture?', 3, null, false),
  ('Spiritual Disciplines', 'Do you regularly fast?', 4, null, false),
  ('Spiritual Disciplines', 'Do you regularly journal?', 5, null, false),
  ('Spiritual Disciplines', 'Are you generous with what you have?', 6, null, false),
  ('Spiritual Disciplines', 'Are you regularly involved (attending) in a local church?', 7, null, false),
  ('Community and Accountability', 'Do you regularly meet with other believers?', 8, null, false),
  ('Community and Accountability', 'Are you in an accountable relationship?', 9, null, false),
  ('Outward-Facing Faith', 'Do you know how to share your faith with others?', 10, null, false),
  ('Outward-Facing Faith', 'Are you intentional about investing in those around you?', 11, null, false),
  ('Outward-Facing Faith', 'Do you give of your time (serve) at a local church or ministry?', 12, null, false),
  ('Personal Holiness', 'Are you disciplining yourself for godliness?', 13, null, false),
  ('Personal Holiness', 'How would you rate the health of your social media habits?', 14, null, false),
  ('Personal Holiness', 'Rate your purity (what you watch or look at, thought life)', 15, null, false),
  ('Personal Holiness', 'How well do you control or manage your anger?', 16, null, false),
  ('Time and Stewardship', 'Do you manage your time well?', 17, null, false),
  ('Time and Stewardship', 'Are you a good steward of the money you have?', 18, null, false),
  ('Spiritual Influence', 'Do you pray with your friends or teammates?', 19, null, false),
  ('Spiritual Influence', 'Are you a spiritual influence on those around you?', 20, null, false),
  ('Family', 'Are you patient with your family?', 21, null, false),
  ('Family', 'Are you spending quality time with your family?', 22, null, false),
  ('Purity and Relationships', 'Do you honor purity in how you treat girls you like or date?', 23, null, false),
  ('Purity and Relationships', 'Are you intentional about who you spend time with romantically?', 24, null, false),
  ('Physical Health', 'Do you eat healthy?', 25, null, false),
  ('Physical Health', 'Do you regularly exercise?', 26, null, false),
  ('Baseball / Competition', 'Do you compete with integrity, even when no one''s watching?', 27, null, false),
  ('Baseball / Competition', 'Are you a good teammate, encouraging others rather than tearing them down?', 28, null, false),
  ('Goal', 'What is one goal you want to work toward this year?', 29, null, true)
) as v(section, prompt, display_order, conditional_flag, is_goal)
where da_categories.slug = 'high_school';

-- ============================================================
-- QA FIXTURE DATA — lets you manually exercise all three
-- identity-lookup states (Section 4) before the admin panel (which
-- creates real groups) exists. Safe to delete once you've tested;
-- clearly named so it's obvious what it's for.
-- ============================================================

insert into public.da_group_labels (category_id, label)
select id, 'QA-Test' from public.da_categories where slug = 'men';

insert into public.da_groups (group_label_id, number)
select gl.id, '01'
from public.da_group_labels gl
where gl.label = 'QA-Test';

-- Retake Tester / 1111: one completed baseline -> should show the retake
-- confirmation screen (with the goal shown back) on next lookup.
insert into public.da_participants (group_id, category_id, is_standalone, first_name, last_four)
select g.id, gl.category_id, false, 'Retake Tester', '1111'
from public.da_groups g
join public.da_group_labels gl on gl.id = g.group_label_id
where gl.label = 'QA-Test' and g.number = '01';

insert into public.da_submissions (participant_id, kind, status, goal_text, completed_at)
select p.id, 'baseline', 'completed', 'Read the Bible every day this year.', now() - interval '30 days'
from public.da_participants p
where p.first_name = 'Retake Tester' and p.last_four = '1111';

-- Completed Tester / 2222: completed baseline + retake -> should show the
-- completed-pair prompt on next lookup.
insert into public.da_participants (group_id, category_id, is_standalone, first_name, last_four)
select g.id, gl.category_id, false, 'Completed Tester', '2222'
from public.da_groups g
join public.da_group_labels gl on gl.id = g.group_label_id
where gl.label = 'QA-Test' and g.number = '01';

insert into public.da_submissions (participant_id, kind, status, completed_at)
select p.id, 'baseline', 'completed', now() - interval '60 days'
from public.da_participants p
where p.first_name = 'Completed Tester' and p.last_four = '2222';

insert into public.da_submissions (participant_id, kind, status, completed_at)
select p.id, 'retake', 'completed', now() - interval '5 days'
from public.da_participants p
where p.first_name = 'Completed Tester' and p.last_four = '2222';
