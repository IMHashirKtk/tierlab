-- ==============================================================================
-- Fix Counter Protection & Author Immutability (2026-10-15)
-- Addresses:
-- 1. Separates direct client updates from authorized counter operations
-- 2. Restricts direct column updates via PostgreSQL column privileges
-- 3. Updates protect_immutable_columns() trigger to allow security definer updates
-- 4. Reconciles existing drifted counters
-- ==============================================================================

-- 1. Column-Level UPDATE Privileges: Prevent ordinary clients from modifying protected counters or metadata
revoke update on public.templates from public, anon, authenticated;
grant update (title, description, category, cover_url, items, default_tiers, author_name, updated_at) on public.templates to authenticated;

revoke update on public.tier_lists from public, anon, authenticated;
grant update (template_id, title, author_name, tiers, unranked) on public.tier_lists to authenticated;

revoke update on public.comments from public, anon, authenticated;

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


-- 2. Update protect_immutable_columns() Trigger (Security Invoker)
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

-- 3. Ensure sync_template_rank_count has search_path set
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

-- 4. Counter Reconciliation RPC
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

-- 5. Execute reconciliation immediately
select public.reconcile_counters();
