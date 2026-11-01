-- DIALD AI: daily limit of 20 "Explain with AI" uses per teacher.
-- Run once in Supabase → SQL Editor. Stores only the teacher id, the date, and a count.

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default (now() at time zone 'America/New_York')::date,
  uses int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
-- No policies: the table is read and written only through the functions below.

-- Uses one credit. Returns how many are left today, or -1 when the limit is reached.
create or replace function public.use_ai_credit() returns int
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); today date := (now() at time zone 'America/New_York')::date; n int;
begin
  if uid is null then raise exception 'not signed in'; end if;
  insert into ai_usage(user_id, day, uses) values (uid, today, 0) on conflict (user_id, day) do nothing;
  update ai_usage set uses = uses + 1 where user_id = uid and day = today and uses < 20 returning uses into n;
  if n is null then return -1; end if;
  return 20 - n;
end $$;

-- Gives a credit back when the AI could not answer.
create or replace function public.refund_ai_credit() returns int
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); today date := (now() at time zone 'America/New_York')::date; n int;
begin
  if uid is null then raise exception 'not signed in'; end if;
  update ai_usage set uses = greatest(uses - 1, 0) where user_id = uid and day = today returning uses into n;
  return 20 - coalesce(n, 0);
end $$;

-- How many uses are left today (for the button label).
create or replace function public.ai_credits_left() returns int
language sql security definer set search_path = public stable as $$
  select 20 - coalesce((select uses from ai_usage where user_id = auth.uid() and day = (now() at time zone 'America/New_York')::date), 0);
$$;

revoke all on function public.use_ai_credit(), public.refund_ai_credit(), public.ai_credits_left() from public, anon;
grant execute on function public.use_ai_credit(), public.refund_ai_credit(), public.ai_credits_left() to authenticated;
