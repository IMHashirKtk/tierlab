-- ==============================================================================
-- Tier List Maker UGC Platform - Supabase PostgreSQL Production Schema
-- ==============================================================================

-- Run the ENTIRE file in Supabase Dashboard > SQL Editor as the postgres role.
-- Supports a fresh database or an upgrade from the repository's old schema.
-- Existing rows are retained. Legacy rows without ownership stay unowned;
-- ownership is never assigned to the person running this script.
-- Replaces the app's legacy policies/RPCs and recalculates engagement counters.
-- All changes commit together; any error rolls the transaction back.
begin;

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

-- Upgrade existing tables: CREATE TABLE IF NOT EXISTS does not add columns.
alter table public.templates add column if not exists author_id text;
alter table public.tier_lists add column if not exists author_id text;
alter table public.comments add column if not exists author_id text;
alter table public.templates alter column author_id set default auth.uid()::text;
alter table public.tier_lists alter column author_id set default auth.uid()::text;
alter table public.comments alter column author_id set default auth.uid()::text;

alter table public.upvotes drop constraint if exists upvotes_item_type_check;
alter table public.upvotes add constraint upvotes_item_type_check
  check (item_type in ('template', 'tier_list', 'comment'));

-- Retire legacy RPCs that accepted client-controlled identity or counters.
drop function if exists public.toggle_upvote(text, text, text);
drop function if exists public.increment_template_rank(text);
drop function if exists public.increment_template_rank_count(text);
drop function if exists public.increment_comment_upvote(text, int);
drop function if exists public.check_upload_rate_limit(text, int, int);

-- Remove permissive policies from the old schema before installing replacements.
drop policy if exists "Allow public insert on templates" on public.templates;
drop policy if exists "Allow public insert on tier_lists" on public.tier_lists;
drop policy if exists "Allow public insert on comments" on public.comments;
drop policy if exists "Allow public update on comments" on public.comments;
drop policy if exists "Allow public read on upvotes" on public.upvotes;
drop policy if exists "Allow public insert on upvotes" on public.upvotes;
drop policy if exists "Allow public delete on upvotes" on public.upvotes;

-- Explicit privileges work even when automatic Data API grants are disabled.
revoke all on public.templates, public.tier_lists, public.comments, public.upvotes
  from public, anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant select on public.templates, public.tier_lists, public.comments to anon, authenticated;
grant insert, delete on public.templates, public.tier_lists, public.comments to authenticated;
grant select on public.upvotes to authenticated;
grant all on public.templates, public.tier_lists, public.comments, public.upvotes to service_role;

-- 6. Enable Row Level Security (RLS) on all tables
alter table public.templates enable row level security;
alter table public.tier_lists enable row level security;
alter table public.upvotes enable row level security;
alter table public.comments enable row level security;
alter table public.upload_rate_limits enable row level security;
revoke all on public.upload_rate_limits from public, anon, authenticated;
grant all on public.upload_rate_limits to service_role;

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
    (author_id = (select auth.uid())::text)
    and coalesce(upvotes, 0) = 0
    and coalesce(rank_count, 0) = 0
  );

drop policy if exists "Allow authenticated insert on tier_lists" on public.tier_lists;
create policy "Allow authenticated insert on tier_lists"
  on public.tier_lists for insert to authenticated
  with check (
    (author_id = (select auth.uid())::text)
    and coalesce(upvotes, 0) = 0
  );

drop policy if exists "Allow authenticated insert on comments" on public.comments;
create policy "Allow authenticated insert on comments"
  on public.comments for insert to authenticated
  with check (
    (author_id = (select auth.uid())::text)
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

-- Owner-Only Deletes
drop policy if exists "Allow owner delete on templates" on public.templates;
create policy "Allow owner delete on templates"
  on public.templates for delete to authenticated
  using (author_id = auth.uid()::text);

drop policy if exists "Allow owner delete on tier_lists" on public.tier_lists;
create policy "Allow owner delete on tier_lists"
  on public.tier_lists for delete to authenticated
  using (author_id = auth.uid()::text);

drop policy if exists "Allow owner delete on comments" on public.comments;
create policy "Allow owner delete on comments"
  on public.comments for delete to authenticated
  using (author_id = auth.uid()::text);


-- Column-Level UPDATE Privileges: Prevent ordinary clients from modifying protected counters or metadata
revoke update on public.templates from public, anon, authenticated;
grant update (title, description, category, cover_url, items, default_tiers, author_name, updated_at) on public.templates to authenticated;

revoke update on public.tier_lists from public, anon, authenticated;
grant update (template_id, title, author_name, tiers, unranked) on public.tier_lists to authenticated;

revoke update on public.comments from public, anon, authenticated;

-- Publication controls are managed by the operator, not by public clients.
alter table public.templates add column if not exists is_test boolean not null default false;
alter table public.templates add column if not exists is_hidden boolean not null default false;
alter table public.tier_lists add column if not exists is_test boolean not null default false;
alter table public.tier_lists add column if not exists is_hidden boolean not null default false;
alter table public.comments add column if not exists is_test boolean not null default false;
alter table public.comments add column if not exists is_hidden boolean not null default false;

alter policy "Allow public read on templates" on public.templates using (not is_test and not is_hidden);
alter policy "Allow public read on tier_lists" on public.tier_lists using (not is_test and not is_hidden);
alter policy "Allow public read on comments" on public.comments using (
  not is_test and not is_hidden and exists (
    select 1 from public.tier_lists r where r.id = comments.tier_list_id and not r.is_test and not r.is_hidden
  )
);
alter policy "Allow authenticated insert on templates" on public.templates with check (
  author_id = (select auth.uid())::text and coalesce(upvotes,0)=0 and coalesce(rank_count,0)=0 and not is_test and not is_hidden
);
alter policy "Allow authenticated insert on tier_lists" on public.tier_lists with check (
  author_id = (select auth.uid())::text and coalesce(upvotes,0)=0 and not is_test and not is_hidden
);
alter policy "Allow authenticated insert on comments" on public.comments with check (
  author_id = (select auth.uid())::text and coalesce(upvotes,0)=0 and not is_test and not is_hidden and exists (
    select 1 from public.tier_lists r where r.id=comments.tier_list_id and not r.is_test and not r.is_hidden
  )
);


-- 10. Triggers: Protect Immutable Columns on UPDATE
create or replace function public.protect_immutable_columns()
returns trigger as $$
begin
  -- Enforce author_id and created_at immutability
  new.author_id := old.author_id;
  new.created_at := old.created_at;

  -- Protect counters from direct client updates (authenticated, anon, public)
  if current_user in ('authenticated', 'anon', 'public') then
    new.is_test := old.is_test;
    new.is_hidden := old.is_hidden;
    new.upvotes := old.upvotes;
    if tg_table_name = 'templates' then
      new.rank_count := old.rank_count;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_protect_immutable_columns_templates on public.templates;
create trigger trg_protect_immutable_columns_templates
  before update on public.templates
  for each row execute function public.protect_immutable_columns();

drop trigger if exists trg_protect_immutable_columns_tier_lists on public.tier_lists;
create trigger trg_protect_immutable_columns_tier_lists
  before update on public.tier_lists
  for each row execute function public.protect_immutable_columns();

drop trigger if exists trg_protect_immutable_columns_comments on public.comments;
create trigger trg_protect_immutable_columns_comments
  before update on public.comments
  for each row execute function public.protect_immutable_columns();

-- 11. Triggers: Full rank_count Lifecycle Trigger on public.tier_lists
create or replace function public.sync_template_rank_count()
returns trigger as $$
declare old_template text; new_template text;
begin
  if tg_op in ('UPDATE','DELETE') then
    if not old.is_test and not old.is_hidden then old_template := old.template_id; end if;
  end if;
  if tg_op in ('UPDATE','INSERT') then
    if not new.is_test and not new.is_hidden then new_template := new.template_id; end if;
  end if;
  if old_template is distinct from new_template then
    if old_template is not null then
      update public.templates set rank_count=greatest(0,rank_count-1), updated_at=now() where id=old_template;
    end if;
    if new_template is not null then
      update public.templates set rank_count=rank_count+1, updated_at=now() where id=new_template;
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$ language plpgsql security definer set search_path=public;

drop trigger if exists trg_sync_template_rank_count on public.tier_lists;
create trigger trg_sync_template_rank_count after insert or delete or update of template_id,is_test,is_hidden on public.tier_lists
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
    select upvotes into current_count from public.templates where id = target_id and not is_test and not is_hidden for update;
  elsif target_type = 'tier_list' then
    select upvotes into current_count from public.tier_lists where id = target_id and not is_test and not is_hidden for update;
  elsif target_type = 'comment' then
    select upvotes into current_count from public.comments c where c.id = target_id and not c.is_test and not c.is_hidden
      and exists (select 1 from public.tier_lists r where r.id=c.tier_list_id and not r.is_test and not r.is_hidden) for update;
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

-- 13. Shared Database Upload Fixed-Window Rate Limiting RPC (Server-Only)
create or replace function public.consume_upload_quota(
  v_user_id text
)
returns jsonb as $$
declare
  v_key text;
  v_now timestamptz := clock_timestamp();
  v_rec record;
  v_window_start timestamptz;
  v_current_count int;
  v_retry_after int := 0;
  v_allowed boolean := false;
begin
  if v_user_id is null or trim(v_user_id) = '' then
    raise exception 'User ID is required for quota consumption' using errcode = '22023';
  end if;

  v_key := 'upload:' || trim(v_user_id);

  -- Atomic initialization: ensure key exists with 0 count on first use without resetting existing rows
  insert into public.upload_rate_limits (key, window_start, count)
  values (v_key, v_now, 0)
  on conflict (key) do nothing;

  -- Lock the row exclusively to serialize concurrent requests for this user
  select window_start, count into v_rec
  from public.upload_rate_limits
  where key = v_key
  for update;

  v_window_start := v_rec.window_start;
  v_current_count := v_rec.count;

  -- Fixed window of 60 seconds (30 requests max)
  if v_now >= v_window_start + interval '60 seconds' then
    -- Window expired: reset window_start to current timestamp and count to 1
    v_window_start := v_now;
    v_current_count := 1;
    v_allowed := true;
    v_retry_after := 0;

    update public.upload_rate_limits
    set window_start = v_window_start,
        count = v_current_count
    where key = v_key;
  else
    -- Within active 60-second window
    if v_current_count < 30 then
      v_current_count := v_current_count + 1;
      v_allowed := true;
      v_retry_after := 0;

      update public.upload_rate_limits
      set count = v_current_count
      where key = v_key;
    else
      v_allowed := false;
      v_retry_after := greatest(1, ceil(extract(epoch from (v_window_start + interval '60 seconds' - v_now)))::int);
    end if;
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'remaining', greatest(0, 30 - v_current_count),
    'retry_after', v_retry_after,
    'current_count', v_current_count,
    'reset_at', (v_window_start + interval '60 seconds')
  );
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.consume_upload_quota(text) from public, anon, authenticated;
grant execute on function public.consume_upload_quota(text) to service_role;

-- 14. Counter Reconciliation RPC
create or replace function public.reconcile_counters()
returns jsonb as $$
declare
  t_count int := 0;
  r_count int := 0;
  c_count int := 0;
begin
  update public.templates t
  set rank_count = (select count(*)::int from public.tier_lists r where r.template_id = t.id and not r.is_test and not r.is_hidden),
      upvotes = (select count(*)::int from public.upvotes u where u.item_type = 'template' and u.item_id = t.id);
  get diagnostics t_count = row_count;

  update public.tier_lists r
  set upvotes = (select count(*)::int from public.upvotes u where u.item_type = 'tier_list' and u.item_id = r.id);
  get diagnostics r_count = row_count;

  update public.comments c
  set upvotes = (select count(*)::int from public.upvotes u where u.item_type = 'comment' and u.item_id = c.id);
  get diagnostics c_count = row_count;

  return jsonb_build_object(
    'templates_reconciled', t_count,
    'tier_lists_reconciled', r_count,
    'comments_reconciled', c_count
  );
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.reconcile_counters() from public, anon, authenticated;
grant execute on function public.reconcile_counters() to service_role;


-- Trigger functions are invoked through their triggers, not as public RPCs.
revoke all on function public.protect_immutable_columns() from public, anon, authenticated;
revoke all on function public.sync_template_rank_count() from public, anon, authenticated;

-- Preserve known pre-launch fixtures, excluding them from all public reads.
update public.templates set is_test=true where author_name='launch-test' and title='Launch Test — Reusable Template' and created_at < '2026-10-19 12:00:00+00';
update public.tier_lists set is_test=true where created_at < '2026-10-19 12:00:00+00' and (
  author_name='launch-test' or
  (author_name='Anonymous Ranker' and template_id='elden-ring-bosses' and (
    title='Elden Ring Bosses (Audited)' or (title='Elden Ring: Shadow of the Erdtree Bosses' and not exists (select 1 from jsonb_array_elements(tiers) t where jsonb_array_length(coalesce(t->'items','[]'::jsonb))>0))
  ))
);
update public.comments set is_test=true where tier_list_id='shared_test_audit_101' or exists (
  select 1 from public.tier_lists r where r.id=comments.tier_list_id and r.is_test
);

-- Derive counters from saved rankings and votes; preserve content rows.
select public.reconcile_counters();

-- Refresh the API schema cache after committing the new columns.
notify pgrst, 'reload schema';
commit;

-- Verification: both new ownership columns should appear in the result.
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('templates', 'tier_lists', 'comments')
  and column_name = 'author_id'
order by table_name;
