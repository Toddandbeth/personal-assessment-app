-- Session 12, migration 2 of 2: the new 42-question adult list.
--
-- The list is stored ONCE, under the existing "men" category. Full Count's
-- Men category and the Intentional Ministries door both read it from there.
--
-- The old Men's questions are RETIRED, not deleted: they keep their rows (so
-- old answers stay stored and nothing is destroyed) but are hidden from
-- everyone (the browser's read policy only returns questions where
-- retired_at is null; reports and the "all required answered" check also
-- skip retired questions). High School is untouched.
--
-- Safe to run more than once: it does nothing if the new list is present.

alter table public.da_questions add column if not exists retired_at timestamptz;

drop policy if exists da_questions_select on public.da_questions;
create policy da_questions_select on public.da_questions
  for select using (retired_at is null);

do $$
declare
  v_cat uuid;
begin
  select id into v_cat from public.da_categories where slug = 'men';
  if v_cat is null then
    raise exception 'men category not found';
  end if;

  if exists (
    select 1 from public.da_questions
    where category_id = v_cat
      and retired_at is null
      and prompt = 'Do you take regular, intentional rest (Sabbath)?'
  ) then
    raise notice 'New adult question list already present; nothing to do.';
    return;
  end if;

  update public.da_questions
  set retired_at = now()
  where category_id = v_cat and retired_at is null;

  insert into public.da_questions (category_id, section, prompt, display_order, conditional_flag, is_goal)
  select v_cat, v.section, v.prompt, v.display_order, v.conditional_flag, v.is_goal
  from (values
    ('Spiritual Disciplines', 'Do you read the Bible daily?', 1, null, false),
    ('Spiritual Disciplines', 'Do you have a daily prayer time?', 2, null, false),
    ('Spiritual Disciplines', 'Do you memorize scripture?', 3, null, false),
    ('Spiritual Disciplines', 'Do you regularly fast?', 4, null, false),
    ('Spiritual Disciplines', 'Do you regularly journal?', 5, null, false),
    ('Spiritual Disciplines', 'Do you give generously? (tithe)', 6, null, false),
    ('Spiritual Disciplines', 'Are you regularly involved (attending) in a local church?', 7, null, false),
    ('Spiritual Disciplines', 'Do you take regular, intentional rest (Sabbath)?', 8, null, false),
    ('Spiritual Disciplines', 'Do you leave margin in your schedule for God and the good things, rather than overscheduling yourself and your family?', 9, null, false),

    ('Heart and Identity', 'Do you find your identity and worth in Christ rather than in performance, appearance, or approval?', 10, null, false),
    ('Heart and Identity', 'How close do you feel to God right now?', 11, null, false),
    ('Heart and Identity', 'Are you free from bitterness or unforgiveness toward anyone?', 12, null, false),
    ('Heart and Identity', 'How would you rate your emotional health (anxiety, discouragement, loneliness)?', 13, null, false),

    ('Community and Accountability', 'Do you regularly meet with other believers?', 14, null, false),
    ('Community and Accountability', 'Does someone know your real struggles and ask you hard questions?', 15, null, false),
    ('Community and Accountability', 'Are you honest with others about your real struggles?', 16, null, false),

    ('Outward-Facing Faith', 'Do you know how to share your faith with others?', 17, null, false),
    ('Outward-Facing Faith', 'Are you intentional about investing in those around you?', 18, null, false),
    ('Outward-Facing Faith', 'Do you give of your time (serve) at a local church or ministry?', 19, null, false),
    ('Outward-Facing Faith', 'Do you represent Christ well and influence others positively at work (or wherever you spend your days)?', 20, null, false),

    ('Personal Holiness', 'Are you disciplining yourself for godliness?', 21, null, false),
    ('Personal Holiness', 'How would you rate the health of your social media habits?', 22, null, false),
    ('Personal Holiness', 'Rate your purity from pornography and sexual content (including sex scenes in shows, movies, and online).', 23, null, false),
    ('Personal Holiness', 'Rate your thought life.', 24, null, false),
    ('Personal Holiness', 'Are you free from anything that controls you (alcohol, drugs, vaping, gambling, gaming, spending, or any other habit)?', 25, null, false),
    ('Personal Holiness', 'How well do you control or manage your anger?', 26, null, false),

    ('Time and Financial Stewardship', 'Do you manage your time well?', 27, null, false),
    ('Time and Financial Stewardship', 'How is your financial health (consumer debt, budget, savings)?', 28, null, false),
    ('Time and Financial Stewardship', 'Are you honest and above reproach at work and with money?', 29, null, false),

    ('Marriage', 'Do you pray with your spouse regularly?', 30, 'married', false),
    ('Marriage', 'Do you put your spouse''s needs above your own?', 31, 'married', false),
    ('Marriage', 'Do you regularly go on dates with your spouse?', 32, 'married', false),
    ('Marriage', 'Are you leading your family spiritually?', 33, 'married', false),
    ('Marriage', 'How would you rate the overall health of your marriage?', 34, 'married', false),

    ('Family', 'Are you patient with your family?', 35, 'has_children', false),
    ('Family', 'Are you spending quality time with your family?', 36, 'has_children', false),
    ('Family', 'Are you intentional in discipling your children?', 37, 'has_children', false),

    ('Single', 'Do you practice purity in your dating relationships?', 38, 'single', false),
    ('Single', 'Are you intentional about who you date, rather than dating without direction or purpose?', 39, 'single', false),
    ('Single', 'Do you have a clear understanding of what you''re looking for in a future spouse?', 40, 'single', false),

    ('Physical Health', 'Do you eat healthy?', 41, null, false),
    ('Physical Health', 'Do you regularly exercise?', 42, null, false),

    ('Goal', 'What is one goal you want to work toward this year?', 43, null, true)
  ) as v(section, prompt, display_order, conditional_flag, is_goal);
end $$;

-- "All required questions answered" check ignores retired questions.
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

  if v_status = 'completed' then
    return jsonb_build_object('status', 'completed');
  end if;

  select count(*) into v_missing_count
  from public.da_questions q
  where q.category_id = v_category_id
    and q.is_goal = false
    and q.retired_at is null
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
