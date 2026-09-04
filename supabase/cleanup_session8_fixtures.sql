-- Session 8: one-off cleanup of test/fixture data created during earlier
-- sessions' testing. This is NOT a schema migration — it only deletes rows,
-- nothing is altered or created. Confirmed with Todd before writing this:
--
--   DELETE: QA-Category (category, empty), TN2026 (region, High School),
--           Hendersonville2026 (region, High School, 8 groups / 0
--           participants), QA-Test (region, Men, 1 group)
--   KEEP:   MinistryTest2026 (region, Men, 2 groups, 4+5 real participants
--           — the active region in current use) and all General/standalone
--           participant pools (not fixture data, left untouched).
--
-- None of the FKs in this schema cascade (see 0001_init.sql), so each
-- region/category is deleted bottom-up through da_responses ->
-- da_submissions -> da_participants -> da_groups -> da_regions, and for
-- QA-Category, any of its own da_questions / standalone da_participants
-- (there shouldn't be any — it never had an assessment — but this is
-- written to be correct even if there are) before the category row itself.

-- ============================================================
-- Regions: TN2026, Hendersonville2026, QA-Test
-- ============================================================

do $$
declare
  v_region_id uuid;
  v_region_name text;
begin
  for v_region_name in select unnest(array['TN2026', 'Hendersonville2026', 'QA-Test'])
  loop
    select id into v_region_id from public.da_regions where name = v_region_name;
    if v_region_id is null then
      raise notice 'Region % not found, skipping', v_region_name;
      continue;
    end if;

    delete from public.da_responses
    where submission_id in (
      select s.id from public.da_submissions s
      join public.da_participants p on p.id = s.participant_id
      join public.da_groups g on g.id = p.group_id
      where g.region_id = v_region_id
    );

    delete from public.da_submissions
    where participant_id in (
      select p.id from public.da_participants p
      join public.da_groups g on g.id = p.group_id
      where g.region_id = v_region_id
    );

    delete from public.da_participants
    where group_id in (select id from public.da_groups where region_id = v_region_id);

    delete from public.da_groups where region_id = v_region_id;

    delete from public.da_regions where id = v_region_id;

    raise notice 'Deleted region %', v_region_name;
  end loop;
end $$;

-- ============================================================
-- Category: QA-Category (and anything hanging directly off it)
-- ============================================================

do $$
declare
  v_category_id uuid;
begin
  select id into v_category_id from public.da_categories where name = 'QA-Category';
  if v_category_id is null then
    raise notice 'Category QA-Category not found, skipping';
    return;
  end if;

  delete from public.da_responses
  where submission_id in (
    select s.id from public.da_submissions s
    join public.da_participants p on p.id = s.participant_id
    where p.category_id = v_category_id
  );

  delete from public.da_submissions
  where participant_id in (
    select id from public.da_participants where category_id = v_category_id
  );

  delete from public.da_participants where category_id = v_category_id;

  delete from public.da_questions where category_id = v_category_id;

  -- da_regions for this category already handled above if any existed;
  -- QA-Category had none at the time this was written.
  delete from public.da_regions where category_id = v_category_id;

  delete from public.da_categories where id = v_category_id;

  raise notice 'Deleted category QA-Category';
end $$;
