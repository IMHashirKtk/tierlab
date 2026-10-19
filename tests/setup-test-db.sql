-- Setup Supabase auth mock schema and roles for test DB
create schema if not exists auth;

create or replace function auth.uid() returns text as $$
begin
  return nullif(current_setting('request.jwt.claim.sub', true), '');
end;
$$ language plpgsql stable;

do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end $$;

grant anon, authenticated, service_role to postgres;
