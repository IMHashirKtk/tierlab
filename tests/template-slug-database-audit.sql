-- Run as postgres against the migrated database. Every fixture rolls back.
begin;
do $$ begin
  assert private.template_slug_base('  Blox Fruits Fruits!!  ')='blox-fruits-fruits';
  assert private.template_slug_base('!!!')='template';
  assert private.template_slug_base('日本語')='template';
  assert private.template_slug_base('A & B / C')='a-b-c';
  assert length(private.template_slug_base(repeat('a',79)||' - more'))=79;
end; $$;

-- Hidden titles reserve their slug, but stay invisible to the publisher.
insert into public.templates(id,title,is_hidden,is_test)
values ('slug-audit-hidden-record','Slug Migration Audit Collision',true,true);
set local role authenticated;
set local request.jwt.claims='{"sub":"e728e68d-aed9-4358-9d17-d001ea33aad3","role":"authenticated"}';
insert into public.templates(id,title,author_id,slug)
values ('slug-audit-first-record','Slug Migration Audit Collision','e728e68d-aed9-4358-9d17-d001ea33aad3','client-cannot-choose-this'),
       ('slug-audit-second-record','Slug Migration Audit Collision','e728e68d-aed9-4358-9d17-d001ea33aad3','client-cannot-choose-this'),
       ('slug-audit-library-collision','Elden Ring Bosses','e728e68d-aed9-4358-9d17-d001ea33aad3',null),
       ('slug-audit-legacy-collision','b-ie9n','e728e68d-aed9-4358-9d17-d001ea33aad3',null);
do $$ begin
  assert (select slug='slug-migration-audit-collision-2' from public.templates where id='slug-audit-first-record');
  assert (select slug='slug-migration-audit-collision-3' from public.templates where id='slug-audit-second-record');
  assert (select slug<>'elden-ring-bosses' and slug like 'elden-ring-bosses-%' from public.templates where id='slug-audit-library-collision');
  assert (select slug='b-ie9n-2' from public.templates where id='slug-audit-legacy-collision');
  assert not exists(select 1 from public.templates where id='slug-audit-hidden-record');
end; $$;
-- Owner title edits cannot invalidate the URL. IDs/slugs have no client UPDATE grant.
update public.templates set title='Edited title'
where id='slug-audit-first-record';
reset role;
-- Even a privileged maintenance update cannot silently break existing links.
update public.templates set id='slug-audit-reassigned',slug='slug-audit-renamed' where id='slug-audit-first-record';
do $$ begin
  assert (select slug='slug-migration-audit-collision-2' and title='Edited title' from public.templates where id='slug-audit-first-record');
  assert not exists(select 1 from public.templates where id='slug-audit-reassigned');
end; $$;
rollback;
select 'PASS: normalization, hidden collisions, duplicate titles, reserved library and legacy URLs, stable identity, and authenticated RLS; all fixtures rolled back' as result;
