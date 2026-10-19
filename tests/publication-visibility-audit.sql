\set ON_ERROR_STOP on
begin;
insert into public.templates(id,title,author_id) values ('visibility-template','Visibility test','visibility-owner');
insert into public.tier_lists(id,title,template_id,author_id) values ('visibility-ranking','Visibility test','visibility-template','visibility-owner');
insert into public.comments(id,tier_list_id,content,author_id) values ('visibility-comment','visibility-ranking','Test comment','visibility-owner');
update public.tier_lists set is_test=true where id='visibility-ranking';
do $$ begin
  if (select rank_count from public.templates where id='visibility-template') <> 0 then raise exception 'Test ranking counted'; end if;
end $$;
set local role anon;
do $$ begin
  if exists(select 1 from public.tier_lists where id='visibility-ranking') then raise exception 'Test ranking exposed'; end if;
  if exists(select 1 from public.comments where id='visibility-comment') then raise exception 'Comment on test ranking exposed'; end if;
end $$;
reset role;
update public.tier_lists set is_test=false where id='visibility-ranking';
do $$ begin
  if (select rank_count from public.templates where id='visibility-template') <> 1 then raise exception 'Restored ranking missing from count'; end if;
end $$;
update public.tier_lists set is_hidden=true where id='visibility-ranking';
set local role authenticated;
set local "request.jwt.claim.sub"='visibility-owner';
do $$ begin
  begin
    update public.tier_lists set is_hidden=false where id='visibility-ranking';
    raise exception 'Client changed moderation status';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.tier_lists(id,title,is_test) values ('visibility-forged','Forged',true);
    raise exception 'Client inserted test content';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.comments(id,tier_list_id,content) values ('visibility-forged-comment','visibility-ranking','Not allowed');
    raise exception 'Client commented on hidden ranking';
  exception when insufficient_privilege then null; end;
  begin
    perform public.set_vote('tier_list','visibility-ranking',true);
    raise exception 'Client voted on hidden ranking';
  exception when no_data_found then null; end;
  begin
    perform public.set_vote('comment','visibility-comment',true);
    raise exception 'Client voted on comment under hidden ranking';
  exception when no_data_found then null; end;
end $$;
reset role;
rollback;
\echo PASS: public visibility, parent comments, protected flags, voting and reversible counters
