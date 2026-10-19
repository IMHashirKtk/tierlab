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
    select upvotes into current_count from public.comments where id = target_id and not is_test and not is_hidden for update;
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

select public.reconcile_counters();
notify pgrst, 'reload schema';
