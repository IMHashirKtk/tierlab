-- ==============================================================================
-- Supabase Audit Remediation Migration (2026-10-15)
-- Addresses:
-- 1. Idempotent locked voting via set_vote() with cryptographic auth.uid() check
-- 2. Ownership-bound RLS policies and immutable counter triggers
-- 3. Full rank_count lifecycle trigger on public.tier_lists
-- 4. Shared database rate limiting for uploads
-- 5. Existing counter reconciliation
-- ==============================================================================

-- 1. Drop outdated functions
drop function if exists public.toggle_upvote(text, text, text);
drop function if exists public.increment_template_rank(text);
drop function if exists public.increment_template_rank_count(text);
drop function if exists public.increment_comment_upvote(text, int);

-- 2. Ensure schema columns and default counter values
alter table public.tier_lists add column if not exists author_id text default auth.uid()::text;
alter table public.comments add column if not exists author_id text default auth.uid()::text;

alter table public.templates alter column upvotes set default 0;
alter table public.templates alter column rank_count set default 0;
alter table public.tier_lists alter column upvotes set default 0;
alter table public.comments alter column upvotes set default 0;

-- 3. Expand public.upvotes item_type constraint to allow 'comment'
alter table public.upvotes drop constraint if exists upvotes_item_type_check;
alter table public.upvotes add constraint upvotes_item_type_check check (item_type in ('template', 'tier_list', 'comment'));

-- 4. Secure public.upvotes RLS policies
drop policy if exists "Allow public read on upvotes" on public.upvotes;
drop policy if exists "Allow public insert on upvotes" on public.upvotes;
drop policy if exists "Allow public delete on upvotes" on public.upvotes;
drop policy if exists "Allow authenticated read own upvotes" on public.upvotes;

create policy "Allow authenticated read own upvotes" on public.upvotes
  for select to authenticated
  using (voter_hash = auth.uid()::text);

-- 5. Atomic & Idempotent Locked Voting RPC Function
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

-- 6. Enforce Ownership and Zero Initial Counters on INSERT
drop policy if exists "Allow public insert on templates" on public.templates;
drop policy if exists "Allow authenticated insert on templates" on public.templates;
create policy "Allow authenticated insert on templates" on public.templates
  for insert to authenticated
  with check (
    (author_id is null or author_id = auth.uid()::text)
    and coalesce(upvotes, 0) = 0
    and coalesce(rank_count, 0) = 0
  );

drop policy if exists "Allow public insert on tier_lists" on public.tier_lists;
drop policy if exists "Allow authenticated insert on tier_lists" on public.tier_lists;
create policy "Allow authenticated insert on tier_lists" on public.tier_lists
  for insert to authenticated
  with check (
    (author_id is null or author_id = auth.uid()::text)
    and coalesce(upvotes, 0) = 0
  );

drop policy if exists "Allow public insert on comments" on public.comments;
drop policy if exists "Allow authenticated insert on comments" on public.comments;
create policy "Allow authenticated insert on comments" on public.comments
  for insert to authenticated
  with check (
    (author_id is null or author_id = auth.uid()::text)
    and coalesce(upvotes, 0) = 0
  );

-- 7. Owner-Only UPDATE Policies
drop policy if exists "Allow owner update on templates" on public.templates;
create policy "Allow owner update on templates" on public.templates
  for update to authenticated
  using (author_id = auth.uid()::text)
  with check (author_id = auth.uid()::text);

drop policy if exists "Allow owner update on tier_lists" on public.tier_lists;
create policy "Allow owner update on tier_lists" on public.tier_lists
  for update to authenticated
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

-- 8. Trigger to Protect Immutable Columns on UPDATE
create or replace function public.protect_immutable_columns()
returns trigger as $$
begin
  -- Enforce author_id and created_at immutability
  new.author_id := old.author_id;
  new.created_at := old.created_at;

  -- Protect counters from direct client updates (authenticated, anon, public)
  if current_user in ('authenticated', 'anon', 'public') then
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

-- 9. Full rank_count Lifecycle Trigger on public.tier_lists
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
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_sync_template_rank_count on public.tier_lists;
create trigger trg_sync_template_rank_count
  after insert or delete or update of template_id on public.tier_lists
  for each row execute function public.sync_template_rank_count();

-- 10. Shared Database Upload Fixed-Window Rate Limiting (Server-Only)
create table if not exists public.upload_rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count int not null
);

alter table public.upload_rate_limits enable row level security;
revoke all on public.upload_rate_limits from public, anon, authenticated;
grant all on public.upload_rate_limits to service_role;

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

-- 11. Counter Reconciliation RPC
create or replace function public.reconcile_counters()
returns jsonb as $$
declare
  t_count int := 0;
  r_count int := 0;
  c_count int := 0;
begin
  update public.templates t
  set rank_count = (select count(*)::int from public.tier_lists r where r.template_id = t.id),
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

-- 12. Execute Counter Reconciliation
select public.reconcile_counters();

