# Launch operations

The public operator is HashirK. Support, privacy and content reports go to Hello@hashirk.com through the Contact page. No report email is sent automatically.

## Public content and test data

The production Supabase project is TierListMaker (`bljusojqzfyryaqbnkbi`). `templates`, `tier_lists`, and `comments` have operator-controlled `is_test` and `is_hidden` fields. Public reads exclude either flag. Comments also require a visible parent ranking. Public clients cannot set or change these flags, and voting checks visibility.

Use the Supabase Table Editor as the operator to set `is_hidden = true` when reviewing a report. Verify the public URL no longer exposes the content. Clear the flag to restore content after review. The underlying record remains; hiding is not deletion. Use `is_test = true` for audit fixtures before making them public. Run future end-to-end publishing tests against a separate staging database rather than the public production catalog.

The 19 October cleanup preserved 1 test template, 11 test rankings and 4 test comments. It removed their public visibility and excluded test rankings from template counters. The 20 starter templates retain stable IDs, accurate scoped titles and reviewed descriptions; unrelated stock photos were removed. No user-created template was replaced.

## Verification

- Build: `NEXT_TEST_DIST_DIR=.next-test-audit` with `next build` (set the variable using your shell's syntax).
- Run the local production server, then `node tests/live-readiness-audit.mjs`.
- For a deployed host, set `AUDIT_BASE_URL` before running the same audit.
- Database tests: run `tests/publication-visibility-audit.sql` only in an isolated local test database. The test rolls back its records.
- Schema upgrades are saved in `supabase/migrations/`; `supabase/schema.sql` is the complete upgrade-safe schema.

## Google launch

Connect `tierlistmaker.app` to the **tierlab-production** Vercel project. Keep **tierlab-staging** separate. Redirect `www.tierlistmaker.app` to the apex domain. Check HTTPS, robots, all sitemap URLs and canonical tags on the final domain.

The owner must authenticate to Google Search Console. Verify the domain or URL-prefix property using Google's verification instructions, submit `https://tierlistmaker.app/sitemap.xml`, and inspect the homepage, a category and a template. Request indexing only after the live checks pass. Search Console verification and sitemap submission do not guarantee indexing or ranking.

Run a mobile PageSpeed Insights check after the domain is live. A new site may not yet have enough real-user data for Core Web Vitals; lab measurements do not replace that field data. Monitor errors, content reports and Search Console after launch.
