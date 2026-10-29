-- DIALD — Plans update v2 (run once in SQL Editor → New query → Run)
-- 1) Plans can have a name chosen by the teacher.
-- 2) The database itself refuses anything that is not on the allowed list,
--    so student names or IDs cannot be stored even by mistake.

alter table public.plans add column if not exists title text;

alter table public.plans drop constraint if exists plans_title_ok;
alter table public.plans add constraint plans_title_ok
  check (title is null or (char_length(title) <= 60 and title !~ '[0-9]{5,}'));

-- Allowed keys only (anything else is rejected).
create or replace function public.plans_only_allowed(p_inputs jsonb, p_result jsonb, p_progress jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare k text; el jsonb;
begin
  for k in select jsonb_object_keys(p_inputs) loop
    if k not in ('grade','years','highLevel','periods','academic','priorResponse','test') then return false; end if;
  end loop;
  for el in select * from jsonb_array_elements(coalesce(p_inputs->'periods','[]'::jsonb)) loop
    for k in select jsonb_object_keys(el) loop
      if k not in ('label','listening','speaking','reading','writing','overall','scale','test') then return false; end if;
    end loop;
    if coalesce(el->>'label','') !~ '^[A-Za-z0-9 .,/()–-]{0,24}$' or coalesce(el->>'label','') ~ '[0-9]{5,}' then return false; end if;
    for k in select unnest(array['listening','speaking','reading','writing','overall']) loop
      if el ? k and jsonb_typeof(el->k) not in ('number','null') then return false; end if;
    end loop;
    if el ? 'scale' then
      if jsonb_typeof(el->'scale') <> 'object' then return false; end if;
      for k in select jsonb_object_keys(el->'scale') loop
        if k not in ('listening','speaking','reading','writing') or jsonb_typeof(el->'scale'->k) <> 'number' then return false; end if;
      end loop;
    end if;
  end loop;
  if coalesce(p_inputs->>'grade','') !~ '^[A-Za-z0-9-]{0,6}$' then return false; end if;
  if p_inputs ? 'years' and jsonb_typeof(p_inputs->'years') not in ('number','null') and coalesce(p_inputs->>'years','') <> '' then return false; end if;
  for k in select jsonb_object_keys(p_result) loop
    if k not in ('quadrant','risk','priorities','concerns') then return false; end if;
  end loop;
  for el in select * from jsonb_array_elements(p_progress) loop
    for k in select jsonb_object_keys(el) loop
      if k not in ('pathwayId','baseline','current','goal','implementation') then return false; end if;
    end loop;
  end loop;
  return true;
end $$;

alter table public.plans drop constraint if exists plans_allowed_fields;
alter table public.plans add constraint plans_allowed_fields
  check (public.plans_only_allowed(inputs, result, progress)) not valid;
