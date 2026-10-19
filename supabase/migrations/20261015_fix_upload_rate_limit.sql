-- ==============================================================================
-- Fix Upload Rate Limit Vulnerability & Server-Only Quota Enforcement (2026-10-15)
-- Addresses:
-- 1. Drops vulnerable check_upload_rate_limit(text, int, int) RPC
-- 2. Restricts upload_rate_limits table access exclusively to trusted service_role
-- 3. Implements atomic, concurrency-safe fixed-window limiter consume_upload_quota(text)
-- 4. Restricts consume_upload_quota execution strictly to service_role
-- ==============================================================================

-- 1. Drop vulnerable public limiter function
drop function if exists public.check_upload_rate_limit(text, int, int);

-- 2. Secure upload_rate_limits table
alter table public.upload_rate_limits enable row level security;
revoke all on public.upload_rate_limits from public, anon, authenticated;
grant all on public.upload_rate_limits to service_role;

-- 3. Atomic, Concurrency-Safe Fixed-Window Limiter RPC (30 requests / 60 seconds)
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

-- 4. Restrict execution strictly to service_role (trusted server role)
revoke all on function public.consume_upload_quota(text) from public, anon, authenticated;
grant execute on function public.consume_upload_quota(text) to service_role;
