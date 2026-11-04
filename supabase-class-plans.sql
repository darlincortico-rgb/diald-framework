-- DIALD — Class plans (run once in SQL Editor → New query → Run)
-- Groups the quadrant plans of one class under one "class plan" with a name the teacher can edit.
alter table public.group_plans add column if not exists set_id uuid;
alter table public.group_plans add column if not exists set_name text;
alter table public.group_plans drop constraint if exists group_plans_set_name_ok;
alter table public.group_plans add constraint group_plans_set_name_ok
  check (set_name is null or (char_length(set_name) <= 60 and set_name !~ '[0-9]{5,}'));
create index if not exists group_plans_set on public.group_plans (set_id);
