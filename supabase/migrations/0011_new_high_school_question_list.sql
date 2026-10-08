-- Migration 11: the updated High School question list (37 questions + Goal).
--
-- Three existing questions are reworded and nine are added. The adult ("men")
-- list and everything else are NOT touched.
--
-- The old High School questions are RETIRED, not deleted (same method as the
-- adult list in migration 10): their rows stay, but the browser's read policy
-- only returns questions where retired_at is null, and reports and the
-- "all required answered" check skip retired questions.
--
-- SAFETY: if any answer already exists on a High School question, this stops
-- with an error and changes nothing. (At the time of writing there are none.)
--
-- Safe to run more than once: it does nothing if the new list is present.

do $$
declare
  v_cat uuid;
begin
  select id into v_cat from public.da_categories where slug = 'high_school';
  if v_cat is null then
    raise exception 'high_school category not found';
  end if;

  if exists (
    select 1 from public.da_questions
    where category_id = v_cat
      and retired_at is null
      and prompt = 'Does someone know your real struggles and ask you hard questions?'
  ) then
    raise notice 'New High School question list already present; nothing to do.';
    return;
  end if;

  if exists (
    select 1
    from public.da_responses r
    join public.da_questions q on q.id = r.question_id
    where q.category_id = v_cat
  ) then
    raise exception 'High School answers already exist; nothing was changed. Tell Claude before going further.';
  end if;

  update public.da_questions
  set retired_at = now()
  where category_id = v_cat and retired_at is null;

  insert into public.da_questions (category_id, section, prompt, display_order, conditional_flag, is_goal)
  select v_cat, v.section, v.prompt, v.display_order, null, v.is_goal
  from (values
    ('Spiritual Disciplines', 'Do you read the Bible daily?', 1, false),
    ('Spiritual Disciplines', 'Do you have a daily prayer time?', 2, false),
    ('Spiritual Disciplines', 'Do you memorize scripture?', 3, false),
    ('Spiritual Disciplines', 'Do you regularly fast?', 4, false),
    ('Spiritual Disciplines', 'Do you regularly journal?', 5, false),
    ('Spiritual Disciplines', 'Are you generous with what you have?', 6, false),
    ('Spiritual Disciplines', 'Are you regularly involved (attending) in a local church?', 7, false),

    ('Heart and Identity', 'Do you find your identity and worth in Christ rather than in performance, appearance, or popularity?', 8, false),
    ('Heart and Identity', 'How close do you feel to God right now?', 9, false),
    ('Heart and Identity', 'Are you free from bitterness or unforgiveness toward anyone?', 10, false),
    ('Heart and Identity', 'How would you rate your emotional health (anxiety, discouragement, loneliness)?', 11, false),

    ('Community and Accountability', 'Do you regularly meet with other believers?', 12, false),
    ('Community and Accountability', 'Does someone know your real struggles and ask you hard questions?', 13, false),
    ('Community and Accountability', 'Are you honest with others about your real struggles?', 14, false),

    ('Outward-Facing Faith', 'Do you know how to share your faith with others?', 15, false),
    ('Outward-Facing Faith', 'Are you intentional about investing in those around you?', 16, false),
    ('Outward-Facing Faith', 'Do you give of your time (serve) at a local church or ministry?', 17, false),

    ('Personal Holiness', 'Are you disciplining yourself for godliness?', 18, false),
    ('Personal Holiness', 'How would you rate the health of your social media habits?', 19, false),
    ('Personal Holiness', 'Rate your purity from pornography and sexual content (including sex scenes in shows, movies, and online).', 20, false),
    ('Personal Holiness', 'Rate your thought life.', 21, false),
    ('Personal Holiness', 'Are you free from anything that controls you (alcohol, drugs, vaping, gaming, or any other habit)?', 22, false),
    ('Personal Holiness', 'How well do you control or manage your anger?', 23, false),

    ('Time and Stewardship', 'Do you manage your time well?', 24, false),
    ('Time and Stewardship', 'Are you a good steward of the money you have?', 25, false),
    ('Time and Stewardship', 'Are you honest in your schoolwork (no cheating or cutting corners)?', 26, false),

    ('Spiritual Influence', 'Do you pray with your friends or teammates?', 27, false),
    ('Spiritual Influence', 'Do you represent Christ well and influence others positively at school and on your team?', 28, false),

    ('Family', 'Are you patient with your family?', 29, false),
    ('Family', 'Are you spending quality time with your family?', 30, false),
    ('Family', 'Do you honor and respect your parents?', 31, false),

    ('Purity and Relationships', 'Do you honor purity in how you treat girls you like or date?', 32, false),
    ('Purity and Relationships', 'Are you intentional about who you spend time with romantically?', 33, false),

    ('Physical Health', 'Do you eat healthy?', 34, false),
    ('Physical Health', 'Do you regularly exercise?', 35, false),

    ('Baseball / Competition', 'Do you compete with integrity, even when no one''s watching?', 36, false),
    ('Baseball / Competition', 'Are you a good teammate, encouraging others rather than tearing them down?', 37, false),

    ('Goal', 'What is one goal you want to work toward this year?', 38, true)
  ) as v(section, prompt, display_order, is_goal);
end;
$$;

-- Quick check you can run afterwards (should show 37 questions + 1 goal):
--   select is_goal, count(*) from public.da_questions q
--   join public.da_categories c on c.id = q.category_id
--   where c.slug = 'high_school' and q.retired_at is null group by is_goal;
