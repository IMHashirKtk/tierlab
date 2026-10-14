-- Tier List Maker UGC Platform - Supabase PostgreSQL Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- 1. Create Templates Table
create table if not exists public.templates (
  id text primary key,
  title text not null,
  description text default '',
  category text not null default 'gaming',
  cover_url text,
  items jsonb not null default '[]'::jsonb,
  default_tiers jsonb default '[]'::jsonb,
  author_name text not null default 'Anonymous',
  author_id text,
  rank_count int not null default 0,
  upvotes int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexing for fast search and sorting
create index if not exists idx_templates_category on public.templates(category);
create index if not exists idx_templates_created_at on public.templates(created_at desc);
create index if not exists idx_templates_upvotes on public.templates(upvotes desc);
create index if not exists idx_templates_rank_count on public.templates(rank_count desc);

-- 2. Create Tier Lists (Completed Rankings) Table
create table if not exists public.tier_lists (
  id text primary key,
  template_id text references public.templates(id) on delete set null,
  title text not null,
  author_name text not null default 'Anonymous',
  tiers jsonb not null default '[]'::jsonb,
  unranked jsonb not null default '[]'::jsonb,
  upvotes int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_tier_lists_template_id on public.tier_lists(template_id);
create index if not exists idx_tier_lists_created_at on public.tier_lists(created_at desc);

-- 3. Create Upvotes Table (Prevents double-voting)
create table if not exists public.upvotes (
  id text primary key default gen_random_uuid()::text,
  item_type text not null check (item_type in ('template', 'tier_list')),
  item_id text not null,
  voter_hash text not null,
  created_at timestamptz not null default now(),
  constraint unique_upvote unique (item_type, item_id, voter_hash)
);

create index if not exists idx_upvotes_item on public.upvotes(item_id, item_type);

-- 4. Atomic Function: Increment Template Rank Count
create or replace function public.increment_template_rank(t_id text)
returns void as $$
begin
  update public.templates
  set rank_count = rank_count + 1,
      updated_at = now()
  where id = t_id;
end;
$$ language plpgsql security definer;

-- 5. Atomic Function: Toggle Upvote
create or replace function public.toggle_upvote(
  target_type text,
  target_id text,
  voter text
)
returns boolean as $$
declare
  existing_record record;
  now_upvoted boolean;
begin
  select * into existing_record
  from public.upvotes
  where item_type = target_type
    and item_id = target_id
    and voter_hash = voter;

  if found then
    -- Remove vote
    delete from public.upvotes
    where item_type = target_type
      and item_id = target_id
      and voter_hash = voter;

    if target_type = 'template' then
      update public.templates
      set upvotes = greatest(0, upvotes - 1)
      where id = target_id;
    elsif target_type = 'tier_list' then
      update public.tier_lists
      set upvotes = greatest(0, upvotes - 1)
      where id = target_id;
    end if;

    now_upvoted := false;
  else
    -- Insert vote
    insert into public.upvotes (item_type, item_id, voter_hash)
    values (target_type, target_id, voter);

    if target_type = 'template' then
      update public.templates
      set upvotes = upvotes + 1
      where id = target_id;
    elsif target_type = 'tier_list' then
      update public.tier_lists
      set upvotes = upvotes + 1
      where id = target_id;
    end if;

    now_upvoted := true;
  end if;

  return now_upvoted;
end;
$$ language plpgsql security definer;

-- 6. Enable Row Level Security (RLS)
alter table public.templates enable row level security;
alter table public.tier_lists enable row level security;
alter table public.upvotes enable row level security;

-- Public Read Policies
create policy "Allow public read on templates"
  on public.templates for select
  using (true);

create policy "Allow public insert on templates"
  on public.templates for insert
  with check (true);

create policy "Allow public read on tier_lists"
  on public.tier_lists for select
  using (true);

create policy "Allow public insert on tier_lists"
  on public.tier_lists for insert
  with check (true);

create policy "Allow public read on upvotes"
  on public.upvotes for select
  using (true);

create policy "Allow public insert on upvotes"
  on public.upvotes for insert
  with check (true);

create policy "Allow public delete on upvotes"
  on public.upvotes for delete
  using (true);

-- 7. Create Comments Table
create table if not exists public.comments (
  id text primary key,
  tier_list_id text not null,
  author_name text not null default 'Anonymous',
  content text not null,
  upvotes int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_tier_list_id on public.comments(tier_list_id);
create index if not exists idx_comments_created_at on public.comments(created_at desc);

alter table public.comments enable row level security;

create policy "Allow public read on comments"
  on public.comments for select
  using (true);

create policy "Allow public insert on comments"
  on public.comments for insert
  with check (true);

-- SECURITY: No public UPDATE policy on comments. Anonymous clients must never be able to
-- rewrite comment content or upvote counts directly. Revoke it on existing deployments:
drop policy if exists "Allow public update on comments" on public.comments;

-- 8. Atomic Function: Increment / Decrement Comment Upvotes
-- Runs as SECURITY DEFINER so it can bypass RLS for this single, narrowly-scoped mutation.
-- Delta is clamped to [-1, 1] so a client cannot inflate counts with an arbitrary delta.
create or replace function public.increment_comment_upvote(c_id text, delta int default 1)
returns int as $$
declare
  updated_count int;
  safe_delta int := greatest(-1, least(1, coalesce(delta, 1)));
begin
  update public.comments
  set upvotes = greatest(0, upvotes + safe_delta)
  where id = c_id
  returning upvotes into updated_count;

  return coalesce(updated_count, 0);
end;
$$ language plpgsql security definer set search_path = public;
