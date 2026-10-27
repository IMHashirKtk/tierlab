-- Keep IDs (foreign keys, votes, drafts) stable; assign a separate public URL.
-- The templates primary key doubles as the permanent legacy URL alias.
lock table public.templates in share row exclusive mode;
alter table public.templates add column if not exists slug text;
create unique index if not exists templates_slug_key on public.templates(slug);
create schema if not exists private;

-- Keep this list aligned with STARTER_TEMPLATE_IDS in src/lib/catalog.ts.
create or replace function private.is_library_template_id(template_id text)
returns boolean language sql immutable set search_path = '' as $$
  select template_id in ('elden-ring-bosses', 'mcu-movies', 'modern-shonen-anime', 'fast-food-fries', 'roblox-games', 'hip-hop-2020s', 'nba-all-time-goat', 'world-football-goats', 'ai-models-and-tools-2026', 'programming-languages-meta', 'gta-franchise-games', 'energy-drinks-showdown', 'one-piece-characters-tier-list', 'naruto-shippuden-characters-tier-list', 'attack-on-titan-characters-tier-list', 'jujutsu-kaisen-characters-tier-list', 'valorant-agents-meta-tier-list', 'pokemon-starters-all-gens', 'taylor-swift-eras-albums-ranked', 'kanye-west-discography-tier-list');
$$;

create or replace function private.template_slug_base(title text)
returns text language sql immutable set search_path = '' as $$
  select coalesce(nullif(trim(both '-' from left(
    trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')), 80)), ''), 'template');
$$;

-- Deterministic migration: the oldest publication keeps the unsuffixed title.
-- Reserve ALL existing IDs so a canonical slug can never shadow an old URL.
do $$
declare t record; base text; candidate text; suffix int;
begin
  for t in select id,title from public.templates where slug is null
    order by case when private.is_library_template_id(id) then 0 else 1 end, created_at,id
  loop
    if private.is_library_template_id(t.id) then
      candidate := t.id;
    else
      base := private.template_slug_base(t.title);
      candidate := base;
      suffix := 1;
      while private.is_library_template_id(candidate) or exists (
        select 1 from public.templates where (slug=candidate or id=candidate) and id<>t.id
      ) loop
        suffix := suffix+1;
        candidate := base || '-' || suffix;
      end loop;
    end if;
    update public.templates set slug=candidate where id=t.id;
  end loop;
end;
$$;

alter table public.templates alter column slug set not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.templates'::regclass and conname='templates_slug_format') then
    alter table public.templates add constraint templates_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
  end if;
end; $$;

-- Internal trigger only: it must see reserved URLs on hidden rows too, so a
-- public publisher cannot collide with or take over a moderated template URL.
-- Original table RLS still authorizes every insert/update; no API is exposed.
create or replace function private.assign_template_slug()
returns trigger language plpgsql security definer set search_path = '' as $$
declare base text; candidate text; suffix int := 1;
begin
  if tg_op='UPDATE' then
    new.id := old.id;
    new.slug := old.slug;
    return new;
  end if;
  if current_setting('role', true) in ('anon','authenticated') and
    (auth.uid() is null or new.author_id is distinct from auth.uid()::text) then
    raise exception 'Template ownership required' using errcode='42501';
  end if;
  -- Serialize slug allocation across concurrent publishes. Reads after the lock
  -- see the preceding committed allocation, including unlisted/hidden records.
  perform pg_catalog.pg_advisory_xact_lock(741829001);
  if private.is_library_template_id(new.id) then
    if current_setting('role', true) in ('anon','authenticated') then
      raise exception 'Template ID is a reserved library URL' using errcode='23505';
    end if;
    new.slug := new.id;
    return new;
  end if;
  if exists(select 1 from public.templates where slug=new.id) then
    raise exception 'Template ID is a reserved public URL' using errcode='23505';
  end if;
  base := private.template_slug_base(new.title);
  candidate := base;
  while private.is_library_template_id(candidate) or exists (
    select 1 from public.templates where slug=candidate or id=candidate
  ) loop
    suffix := suffix+1;
    candidate := base || '-' || suffix;
  end loop;
  new.slug := candidate;
  return new;
end;
$$;
revoke all on function private.assign_template_slug() from public, anon, authenticated;
revoke all on function private.template_slug_base(text) from public, anon, authenticated;
drop trigger if exists trg_assign_template_slug on public.templates;
create trigger trg_assign_template_slug before insert or update on public.templates
  for each row execute function private.assign_template_slug();
revoke all on function private.is_library_template_id(text) from public, anon, authenticated;
