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

