-- DIALD — Group plans (run once in SQL Editor → New query → Run)
-- A group plan is a 12-week route for a group of students from the same profile (quadrant).
-- It stores ONLY random student codes (like K4P-7TX), the quadrant, and rubric scores (0–2).
-- Names and IDs stay on the teacher's computer (key sheet). The database refuses anything else.

create extension if not exists pgcrypto;

create or replace function public.group_members_ok(m jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare el jsonb; k text; w text; v jsonb;
begin
  if jsonb_typeof(m) <> 'array' or jsonb_array_length(m) > 80 then return false; end if;
  for el in select * from jsonb_array_elements(m) loop
    if jsonb_typeof(el) <> 'object' then return false; end if;
    for k in select jsonb_object_keys(el) loop
      if k not in ('c', 'q', 'a', 's') then return false; end if;
    end loop;
    if coalesce(el->>'c', '') !~ '^[A-Z0-9]{3}-[A-Z0-9]{3}$' then return false; end if;
    if coalesce(el->>'q', '') !~ '^Q[1-4]$' then return false; end if;
    if el ? 'a' and coalesce(el->>'a', '') !~ '^Q[1-4]$' then return false; end if;
    if el ? 's' then
      if jsonb_typeof(el->'s') <> 'object' then return false; end if;
      for w in select jsonb_object_keys(el->'s') loop
        if w not in ('1', '6', '12') then return false; end if;
        if jsonb_typeof(el->'s'->w) <> 'array' or jsonb_array_length(el->'s'->w) <> 4 then return false; end if;
        for v in select * from jsonb_array_elements(el->'s'->w) loop
          if jsonb_typeof(v) = 'null' then continue; end if;
          if jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric not in (0, 1, 2) then return false; end if;
        end loop;
      end loop;
    end if;
  end loop;
  return true;
end $$;

create table if not exists public.group_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text check (title is null or (char_length(title) <= 60 and title !~ '[0-9]{5,}')),
  quadrant    text not null check (quadrant in ('Q1', 'Q2', 'Q3', 'Q4')),
  band        text not null check (band in ('2-3', '4-5', '6-8', '9-12')),
  stage       smallint not null default 1 check (stage between 1 and 4),
  subgroup    text not null default '' check (char_length(subgroup) <= 40 and subgroup ~ '^[A-Za-z0-9 .,/()+–-]*$'),
  start_date  date not null default current_date,
  members     jsonb not null default '[]'::jsonb check (public.group_members_ok(members)),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists group_plans_user on public.group_plans (user_id);

alter table public.group_plans enable row level security;

drop policy if exists "Teachers read own group plans"   on public.group_plans;
drop policy if exists "Teachers add own group plans"    on public.group_plans;
drop policy if exists "Teachers update own group plans" on public.group_plans;
drop policy if exists "Teachers delete own group plans" on public.group_plans;

create policy "Teachers read own group plans"   on public.group_plans for select to authenticated using ((select auth.uid()) = user_id);
create policy "Teachers add own group plans"    on public.group_plans for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Teachers update own group plans" on public.group_plans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Teachers delete own group plans" on public.group_plans for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.group_plans from anon;
grant select, insert, update, delete on public.group_plans to authenticated;

create or replace function public.group_plans_touch()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists group_plans_touch on public.group_plans;
create trigger group_plans_touch before update on public.group_plans
  for each row execute function public.group_plans_touch();
