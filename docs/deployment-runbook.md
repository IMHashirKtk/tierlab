# TierLab Pre-Staging & Production Deployment Runbook

**Branch**: `fix/audit-remediation`  
**Target Environments**: Supabase (PostgreSQL), Cloudflare R2, Next.js Hosting (Vercel / Node Server)  
**Document Status**: Production Pre-Staging Runbook  
**Notice on Database Verification**: SQL migration scripts in this repository have been validated via local SQL parsing and mocked test suites (`tests/publishing-audit.mjs`, `tests/upload-security-audit.mjs`). All SQL migration paths documented below are **UNVERIFIED against a live isolated database container until executed against a real PostgreSQL/Supabase instance**. Do not run destructive SQL on production without prior backup and staging verification.

---

## 1. Architecture & Scope Overview

TierLab relies on three external infrastructure components:
1. **Supabase PostgreSQL & Auth**: Relational persistence for templates, completed tier lists, comments, upvotes, and upload rate-limiting tokens. All client queries access PostgREST (`/rest/v1/`) and Supabase Auth (`/auth/v1/`).
2. **Cloudflare R2 Object Storage**: S3-compatible persistent storage for uploaded user images, served via a public CDN URL or custom domain.
3. **Browser Local Storage (IndexedDB v2)**: Client-side draft persistence for image-heavy template creation and offline project drafts in IndexedDB database `"tierlistmaker"`.

---

## 2. Pre-Flight Read-Only Inspection Queries

Before applying any migration or schema changes to an existing database, run the following read-only queries in the Supabase SQL Editor or `psql` to determine the exact schema state, installed functions, privileges, and migration history.

### 2.1 Check Recorded Migration History
```sql
-- Check which migration versions are already recorded (if using Supabase CLI migration tracking)
SELECT version, inserted_at 
FROM supabase_migrations.schema_migrations 
ORDER BY version;
```

### 2.2 Inspect Existing Tables & Columns
```sql
-- Check existing public tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check public.upvotes columns and nullability
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'upvotes'
ORDER BY ordinal_position;

-- Check public.tier_lists columns (specifically author_id)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tier_lists'
ORDER BY ordinal_position;

-- Check public.comments columns (specifically author_id)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'comments'
ORDER BY ordinal_position;
```

### 2.3 Check Check Constraints & Unique Constraints
```sql
-- Check upvotes constraints (specifically item_type check and unique constraint)
SELECT conname, pg_get_constraintdef(c.oid)
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname = 'public' AND conrelid = 'public.upvotes'::regclass;
```

### 2.4 Check Stored Functions & Security Definer Status
```sql
-- Inspect existing RPC functions in public schema
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'set_vote',
    'consume_upload_quota',
    'reconcile_counters',
    'protect_immutable_columns',
    'sync_template_rank_count',
    'check_upload_rate_limit',
    'toggle_upvote'
  )
ORDER BY routine_name;
```

### 2.5 Check Function Execution Privileges (Grantee Audit)
```sql
-- Audit who can execute critical RPCs
SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('set_vote', 'consume_upload_quota', 'check_upload_rate_limit', 'toggle_upvote')
ORDER BY routine_name, grantee;
```

### 2.6 Check Active RLS Policies
```sql
-- List all active RLS policies in public schema
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## 3. Database Migration Analysis & Migration-Version Prefix Issue

### 3.1 Migration Files in Repository
At the reviewed commit (`ccf25bf`), the repository contains:
* [`supabase/schema.sql`](file:///C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/supabase/schema.sql): Complete base schema for fresh installation.
* [`supabase/migrations/20261015_audit_remediation.sql`](file:///C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/supabase/migrations/20261015_audit_remediation.sql): Full audit remediation (385 lines).
* [`supabase/migrations/20261015_fix_counter_protection.sql`](file:///C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/supabase/migrations/20261015_fix_counter_protection.sql): Focused counter protection & immutability trigger (142 lines).
* [`supabase/migrations/20261015_fix_upload_rate_limit.sql`](file:///C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/supabase/migrations/20261015_fix_upload_rate_limit.sql): Focused upload rate limit remediation (93 lines).

### 3.2 The Duplicate Migration-Version Prefix Issue
> [!WARNING]
> All three migration files share the identical `20261015_` date prefix.
> Standard database migration runners (such as the Supabase CLI `supabase db push`, Flyway, or dbmate) order migration scripts by timestamp. When multiple files have identical timestamp prefixes:
> 1. Migration tools sorting strictly by timestamp may fail with a duplicate version key error in `supabase_migrations.schema_migrations`.
> 2. Migration tools sorting alphabetically will execute them in this order:
>    - `20261015_audit_remediation.sql`
>    - `20261015_fix_counter_protection.sql`
>    - `20261015_fix_upload_rate_limit.sql`
>
> **Migration History Precaution**: Do NOT rename existing migration files in git if a database environment (staging or production) has already recorded them in `supabase_migrations.schema_migrations`. Renaming files in source control alters their version identifier and will cause migration runners to treat them as missing or attempt duplicate execution.
>
> **Consolidated Relationship**: `20261015_audit_remediation.sql` is a superset migration that includes all corrections present in `20261015_fix_counter_protection.sql` and `20261015_fix_upload_rate_limit.sql`, along with dropping outdated RPCs (`toggle_upvote`, `increment_template_rank`), establishing `public.set_vote()`, and configuring table RLS.

---

## 4. Installation & Upgrade Instructions

### Path A: Fresh Database Installation (New Environment)
For a brand new Supabase project with an empty database:
1. Open the Supabase SQL Editor or connect via `psql`.
2. Execute [`supabase/schema.sql`](file:///C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/supabase/schema.sql) in its entirety.
3. Verify that all 5 tables are created: `public.templates`, `public.tier_lists`, `public.upvotes`, `public.comments`, `public.upload_rate_limits`.
4. Run the post-install verification query (Section 4.3).

### Path B: Existing Database Upgrade (Staging / Production)
If upgrading an existing database that was provisioned prior to this remediation:
1. Run the read-only inspection queries in Section 2 to assess current state.
2. If `20261015_audit_remediation.sql` has **not** been applied:
   Apply [`supabase/migrations/20261015_audit_remediation.sql`](file:///C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/supabase/migrations/20261015_audit_remediation.sql).
   This script performs the following idempotent actions:
   * **Drops legacy RPCs**:
     ```sql
     drop function if exists public.toggle_upvote(text, text, text);
     drop function if exists public.increment_template_rank(text);
     drop function if exists public.increment_template_rank_count(text);
     drop function if exists public.increment_comment_upvote(text, int);
     drop function if exists public.check_upload_rate_limit(text, int, int);
     ```
   * **Ensures author columns**: Adds `author_id text default auth.uid()::text` to `tier_lists` and `comments`.
   * **Configures `public.upvotes`**:
     * Columns: `id text primary key`, `item_type text check (item_type in ('template', 'tier_list', 'comment'))`, `item_id text not null`, `voter_hash text not null`, `created_at timestamptz`.
     * Constraint: `unique (item_type, item_id, voter_hash)`.
     * RLS: Authenticated users can only read where `voter_hash = auth.uid()::text`.
   * **Installs `public.set_vote()` RPC**:
     * Signature: `public.set_vote(target_type text, target_id text, desired_vote boolean) RETURNS jsonb`.
     * Privileges: Revoked from `public` and `anon`; granted exclusively to `authenticated`.
   * **Protects Column-Level UPDATE Privileges**:
     * Revokes direct column updates on counter fields (`upvotes`, `rank_count`) from `public`, `anon`, and `authenticated`.
     * Grants updates only on content fields (`title`, `description`, `items`, etc.).
   * **Installs Immutability Trigger**:
     * Trigger function: `public.protect_immutable_columns()`.
     * Installed on: `templates`, `tier_lists`, `comments` before update.
     * Prevents altering `author_id` or `created_at`.
   * **Installs Rank Count Sync Trigger**:
     * Trigger function: `public.sync_template_rank_count()`.
     * Installed on: `tier_lists` after insert, delete, or update of `template_id`.
   * **Installs Rate Limiter Table & RPC**:
     * Table: `public.upload_rate_limits (key text primary key, window_start timestamptz not null, count int not null)`.
     * Table RLS: Revoked from `public`, `anon`, and `authenticated`; granted exclusively to `service_role`.
     * RPC: `public.consume_upload_quota(v_user_id text) RETURNS jsonb`.
     * Privileges: Revoked from `public`, `anon`, and `authenticated`; granted exclusively to `service_role`.
   * **Reconciles Counters**:
     * RPC: `public.reconcile_counters() RETURNS jsonb` (granted exclusively to `service_role`).
     * Executes immediately via `SELECT public.reconcile_counters();` to resynchronize drifted counter columns against actual `public.upvotes` and `public.tier_lists` counts.

### 4.3 Post-Install / Upgrade Verification Queries
Run this check to confirm all security constraints are properly applied:
```sql
-- 1. Verify vulnerable check_upload_rate_limit is GONE
SELECT count(*) = 0 AS is_vulnerable_limiter_removed
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'check_upload_rate_limit';

-- 2. Verify consume_upload_quota is ONLY granted to service_role
SELECT grantee = 'service_role' AS is_quota_limiter_secure
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' AND routine_name = 'consume_upload_quota';

-- 3. Verify set_vote is granted to authenticated and NOT anon
SELECT 
  bool_and(grantee = 'authenticated') AS is_set_vote_auth_only,
  bool_or(grantee = 'anon') AS is_set_vote_anon_exposed
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' AND routine_name = 'set_vote';

-- 4. Verify upvotes table columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'upvotes'
ORDER BY ordinal_position;
-- Expected output: id, item_type, item_id, voter_hash, created_at

-- 5. Verify upload_rate_limits table permissions
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' AND table_name = 'upload_rate_limits';
-- Expected: only service_role (no anon, no authenticated)
```

---

## 5. Application Environment Variables

The application references the following exact environment variables in source code:

| Variable Name | Required | Target / Scope | Application File Reference | Purpose |
| :--- | :---: | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Client & Server | [`src/lib/supabase.ts`](file:///C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/src/lib/supabase.ts), [`src/lib/server/supabase-admin.ts`](file:///C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/src/lib/server/supabase-admin.ts) | Public Supabase API URL (e.g. `https://<ref>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Client & Server | [`src/lib/supabase.ts`](file:///C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/src/lib/supabase.ts) | Public anonymous key for client sessions and public queries. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | **Server-Only** | [`src/lib/server/supabase-admin.ts`](file:///C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/src/lib/server/supabase-admin.ts) | Privileged service key used exclusively by server API routes to invoke `consume_upload_quota`. **Never expose to browser.** |
| `CLOUDFLARE_R2_ACCOUNT_ID` | **Yes** | **Server-Only** | [`src/lib/r2.ts`](file:///C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/src/lib/r2.ts) | Cloudflare account identifier for S3 API client initialization. |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | **Yes** | **Server-Only** | [`src/lib/r2.ts`](file:///C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/src/lib/r2.ts) | Cloudflare S3 access key ID for uploading batch items. |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | **Yes** | **Server-Only** | [`src/lib/r2.ts`](file:///C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/src/lib/r2.ts) | Cloudflare S3 secret access key for signing upload requests. |
| `CLOUDFLARE_R2_BUCKET_NAME` | No | **Server-Only** | [`src/lib/r2.ts`](file:///C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/src/lib/r2.ts) | Target R2 bucket name (defaults to `"tierlistmaker-items"` if omitted). |
| `CLOUDFLARE_R2_PUBLIC_URL` | **Yes** | **Server-Only** | [`src/lib/r2.ts`](file:///C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/src/lib/r2.ts) | Public CDN base URL for persistent item images (e.g. `https://pub-<hash>.r2.dev` or custom domain). |
| `NEXT_PUBLIC_SITE_URL` | No | Client & Server | [`src/app/layout.tsx`](file:///C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/src/app/layout.tsx), [`src/app/sitemap.ts`](file:///C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/src/app/sitemap.ts) | Canonical site URL for metadata & sitemaps (defaults to `https://tierlistmaker.app`). |

---

## 6. Client Storage (IndexedDB v2) Rollback Limitations

* **Database Name**: `"tierlistmaker"`
* **Database Version**: `2`
* **Object Stores**:
  * `"projects"` (keyPath: `"id"`): Stores saved board rankings and offline projects.
  * `"template_drafts"` (keyPath: `"draftId"`): Stores user drafts created in [`PublishModal.tsx`](file:///C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/src/components/PublishModal.tsx).

> [!CAUTION]
> **IndexedDB Version Rollback Hazard**:
> Modern browser IndexedDB implementations strictly prohibit rolling back a database version. If an end-user loads a build with database version 2, their browser upgrades the local `"tierlistmaker"` database to version 2.
> If the production application is subsequently rolled back to an older commit where the database version was 1:
> 1. Calling `indexedDB.open("tierlistmaker", 1)` will trigger a `VersionError` in the user's browser.
> 2. `openDb()` in [`src/lib/storage.ts`](file:///C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/src/lib/storage.ts) will reject with `VersionError`.
> 3. The user will be unable to load or save local projects until the application is upgraded back to version 2 or the browser's origin storage is manually deleted.
>
> If a rollback of client application code is required, the code must retain `DB_VERSION = 2` and the `"template_drafts"` object store definition in [`src/lib/storage.ts`](file:///C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/src/lib/storage.ts).

---

## 7. Staging Deployment Checklist & Remaining Blockers

Before declaring full production readiness on a live environment, complete the following verification steps:

- [ ] **Staging Supabase Project Provisioned**: Create a dedicated staging project on Supabase.
- [ ] **Run Pre-Flight Inspection**: Execute queries from Section 2 against the staging database.
- [ ] **Apply Migration**: Apply [`supabase/migrations/20261015_audit_remediation.sql`](file:///C:/Users/hashi/.gemini/antigravity/scratch/tierlistmaker/supabase/migrations/20261015_audit_remediation.sql).
- [ ] **Run Post-Install Verification**: Confirm all 5 checks in Section 4.3 pass on the live database.
- [ ] **Provision Staging Cloudflare R2 Bucket**: Create bucket `tierlab-staging-uploads` and generate S3 access credentials.
- [ ] **Configure Staging Environment Variables**: Populate all 8 required variables in the deployment hosting platform.
- [ ] **Live Integration Smoke Test**:
  - Perform real image upload via `/api/upload` and verify file presence in R2 bucket.
  - Publish template via `PublishModal` and confirm database row in `public.templates`.
  - Upvote template and verify atomic counter update via `public.set_vote()`.
- [ ] **Blockers**:
  - SQL migrations have not yet been executed on an external Supabase instance (safety constraint: no production SQL executed from agent).
  - Production Cloudflare R2 bucket credentials must be securely supplied by the infrastructure team.
