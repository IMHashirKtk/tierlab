-- ==============================================================================
-- Tier List Maker UGC Platform - Supabase PostgreSQL Production Schema
-- ==============================================================================

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
  author_id text default auth.uid()::text,
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
  author_id text default auth.uid()::text,
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
  item_type text not null check (item_type in ('template', 'tier_list', 'comment')),
  item_id text not null,
  voter_hash text not null,
  created_at timestamptz not null default now(),
  constraint unique_upvote unique (item_type, item_id, voter_hash)
);

create index if not exists idx_upvotes_item on public.upvotes(item_id, item_type);
create index if not exists idx_upvotes_voter on public.upvotes(voter_hash);

-- 4. Create Comments Table
create table if not exists public.comments (
  id text primary key,
  tier_list_id text not null,
  author_name text not null default 'Anonymous',
  author_id text default auth.uid()::text,
  content text not null,
  upvotes int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_tier_list_id on public.comments(tier_list_id);
create index if not exists idx_comments_created_at on public.comments(created_at desc);

-- 5. Create Upload Rate Limits Table
create table if not exists public.upload_rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count int not null
);

-- 6. Enable Row Level Security (RLS) on all tables
alter table public.templates enable row level security;
alter table public.tier_lists enable row level security;
alter table public.upvotes enable row level security;
alter table public.comments enable row level security;
alter table public.upload_rate_limits enable row level security;

-- 7. RLS Policies: Public Read Access
drop policy if exists "Allow public read on templates" on public.templates;
create policy "Allow public read on templates"
  on public.templates for select
  using (true);

drop policy if exists "Allow public read on tier_lists" on public.tier_lists;
create policy "Allow public read on tier_lists"
  on public.tier_lists for select
  using (true);

drop policy if exists "Allow public read on comments" on public.comments;
create policy "Allow public read on comments"
  on public.comments for select
  using (true);

-- Upvotes read policy: Restricted so clients only see their own votes
drop policy if exists "Allow authenticated read own upvotes" on public.upvotes;
create policy "Allow authenticated read own upvotes"
  on public.upvotes for select to authenticated
  using (voter_hash = auth.uid()::text);

-- 8. RLS Policies: Authenticated Insert with Zero Initial Counters & Ownership
drop policy if exists "Allow authenticated insert on templates" on public.templates;
create policy "Allow authenticated insert on templates"
  on public.templates for insert to authenticated
  with check (
    (author_id is null or author_id = auth.uid()::text)
    and coalesce(upvotes, 0) = 0
    and coalesce(rank_count, 0) = 0
  );

drop policy if exists "Allow authenticated insert on tier_lists" on public.tier_lists;
create policy "Allow authenticated insert on tier_lists"
  on public.tier_lists for insert to authenticated
  with check (
    (author_id is null or author_id = auth.uid()::text)
    and coalesce(upvotes, 0) = 0
  );

drop policy if exists "Allow authenticated insert on comments" on public.comments;
create policy "Allow authenticated insert on comments"
  on public.comments for insert to authenticated
  with check (
    (author_id is null or author_id = auth.uid()::text)
    and coalesce(upvotes, 0) = 0
  );

-- 9. RLS Policies: Owner-Only Updates
drop policy if exists "Allow owner update on templates" on public.templates;
create policy "Allow owner update on templates"
  on public.templates for update to authenticated
  using (author_id = auth.uid()::text)
  with check (author_id = auth.uid()::text);

drop policy if exists "Allow owner update on tier_lists" on public.tier_lists;
create policy "Allow owner update on tier_lists"
  on public.tier_lists for update to authenticated
  using (author_id = auth.uid()::text)
  with check (author_id = auth.uid()::text);

-- 10. Triggers: Protect Immutable Columns on UPDATE
create or replace function public.protect_immutable_columns()
returns trigger as $$
begin
  new.upvotes := old.upvotes;
  new.author_id := old.author_id;
  new.created_at := old.created_at;
  if tg_table_name = 'templates' then
    new.rank_count := old.rank_count;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_protect_immutable_columns_templates on public.templates;
create trigger trg_protect_immutable_columns_templates
  before update on public.templates
  for each row execute function public.protect_immutable_columns();

drop trigger if exists trg_protect_immutable_columns_tier_lists on public.tier_lists;
create trigger trg_protect_immutable_columns_tier_lists
  before update on public.tier_lists
  for each row execute function public.protect_immutable_columns();

-- 11. Triggers: Full rank_count Lifecycle Trigger on public.tier_lists
create or replace function public.sync_template_rank_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    if new.template_id is not null then
      update public.templates
      set rank_count = rank_count + 1, updated_at = now()
      where id = new.template_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.template_id is not null then
      update public.templates
      set rank_count = greatest(0, rank_count - 1), updated_at = now()
      where id = old.template_id;
    end if;
    return old;
  elsif tg_op = 'UPDATE' then
    if old.template_id is distinct from new.template_id then
      if old.template_id is not null then
        update public.templates
        set rank_count = greatest(0, rank_count - 1), updated_at = now()
        where id = old.template_id;
      end if;
      if new.template_id is not null then
        update public.templates
        set rank_count = rank_count + 1, updated_at = now()
        where id = new.template_id;
      end if;
    end if;
    return new;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_template_rank_count on public.tier_lists;
create trigger trg_sync_template_rank_count
  after insert or delete or update of template_id on public.tier_lists
  for each row execute function public.sync_template_rank_count();

-- 12. Atomic & Idempotent Locked Voting RPC Function
create or replace function public.set_vote(
  target_type text,
  target_id text,
  desired_vote boolean
)
returns jsonb as $$
declare
  uid text;
  changed_rows int := 0;
  current_count int := 0;
begin
  uid := auth.uid()::text;
  if uid is null then
    raise exception 'Authentication required to vote' using errcode = '42501';
  end if;

  if target_type not in ('template', 'tier_list', 'comment') then
    raise exception 'Invalid target_type: %', target_type using errcode = '22023';
  end if;

  -- Lock target row to verify existence and serialize concurrent counter updates
  if target_type = 'template' then
    select upvotes into current_count from public.templates where id = target_id for update;
  elsif target_type = 'tier_list' then
    select upvotes into current_count from public.tier_lists where id = target_id for update;
  elsif target_type = 'comment' then
    select upvotes into current_count from public.comments where id = target_id for update;
  end if;

  if not found then
    raise exception 'Target % (%) not found', target_type, target_id using errcode = 'P0002';
  end if;

  if desired_vote then
    insert into public.upvotes (item_type, item_id, voter_hash)
    values (target_type, target_id, uid)
    on conflict (item_type, item_id, voter_hash) do nothing;

    get diagnostics changed_rows = row_count;

    if changed_rows > 0 then
      if target_type = 'template' then
        update public.templates set upvotes = upvotes + 1 where id = target_id returning upvotes into current_count;
      elsif target_type = 'tier_list' then
        update public.tier_lists set upvotes = upvotes + 1 where id = target_id returning upvotes into current_count;
      elsif target_type = 'comment' then
        update public.comments set upvotes = upvotes + 1 where id = target_id returning upvotes into current_count;
      end if;
    end if;
  else
    delete from public.upvotes
    where item_type = target_type
      and item_id = target_id
      and voter_hash = uid;

    get diagnostics changed_rows = row_count;

    if changed_rows > 0 then
      if target_type = 'template' then
        update public.templates set upvotes = greatest(0, upvotes - 1) where id = target_id returning upvotes into current_count;
      elsif target_type = 'tier_list' then
        update public.tier_lists set upvotes = greatest(0, upvotes - 1) where id = target_id returning upvotes into current_count;
      elsif target_type = 'comment' then
        update public.comments set upvotes = greatest(0, upvotes - 1) where id = target_id returning upvotes into current_count;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'isUpvoted', desired_vote,
    'newCount', coalesce(current_count, 0),
    'changed', (changed_rows > 0)
  );
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.set_vote(text, text, boolean) from public, anon;
grant execute on function public.set_vote(text, text, boolean) to authenticated;

-- 13. Shared Database Upload Rate Limiting RPC
create or replace function public.check_upload_rate_limit(
  rate_key text,
  max_count int,
  window_seconds int
)
returns boolean as $$
declare
  now_ts timestamptz := clock_timestamp();
  rec record;
begin
  select * into rec from public.upload_rate_limits where key = rate_key for update;

  if not found then
    insert into public.upload_rate_limits (key, window_start, count)
    values (rate_key, now_ts, 1)
    on conflict (key) do update
      set window_start = excluded.window_start, count = excluded.count;
    return true;
  end if;

  if now_ts > rec.window_start + (window_seconds || ' seconds')::interval then
    update public.upload_rate_limits
    set window_start = now_ts, count = 1
    where key = rate_key;
    return true;
  else
    if rec.count >= max_count then
      return false;
    else
      update public.upload_rate_limits
      set count = rec.count + 1
      where key = rate_key;
      return true;
    end if;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.check_upload_rate_limit(text, int, int) from public;
grant execute on function public.check_upload_rate_limit(text, int, int) to anon, authenticated, service_role;
