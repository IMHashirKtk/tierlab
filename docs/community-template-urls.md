# Community template URLs

Community templates have an immutable database `id` and a separate immutable
public `slug`. Template IDs still identify drafts, votes, projects, rankings,
and consensus. URL generation uses the confirmed database slug.

Migration `20261022145807_community_template_slugs.sql` assigns lowercase,
hyphenated title slugs to existing community records. Duplicate titles receive
`-2`, `-3`, etc. The allocator reserves every existing ID and the library IDs
so a new URL cannot shadow a legacy URL. Library URLs stay unchanged.

An internal database trigger assigns slugs for every new insert, including
publications from older browser clients. A transaction advisory lock serializes
allocation across concurrent publishers. Clients cannot select their slug or
change either identifier through an update. Changing a title preserves its URL.
The private trigger can inspect hidden reservations, but table ownership and
visibility policies still control all publication and discovery.

The original ID remains the permanent alias. Next.js Proxy returns an explicit
HTTP 301 to the canonical slug, preserving the query string. Canonical tags,
structured data, sitemap entries, category cards, search, creator portfolios,
and ranking/remix links use slugs. Existing saved browser copies defer to cloud
slugs. Temporary alias-lookup failures return an uncached 503 rather than serving
an indexable duplicate at the old URL.

## Verification

- `node --experimental-strip-types --loader ./tests/path-loader.mjs tests/template-slug-audit.mjs`
- `tests/template-slug-database-audit.sql`: transactional assertions for actual
  authenticated inserts, duplicate and hidden title collisions, reserved URLs,
  normalization, and identity protection. Every fixture rolls back.
- `node tests/template-slug-live-audit.mjs`: read-only public catalog, all legacy
  301 responses and canonical 200 destinations, sitemap exclusions, category
  links, and representative canonical metadata/content. Set `AUDIT_BASE_URL`
  for the deployed host; reports default to an ignored temporary file.

The production migration preserved checksums of all pre-existing template
content/IDs/counters/timestamps, rankings, and votes. A publication that arrived
between the snapshot and migration was excluded from that snapshot comparison.
The post-migration security advisory check found no new notices.

Search Console already reads `https://tierlistmaker.app/sitemap.xml`. Keep the
301 redirects and Google verification file in future releases. Google will
recrawl the sitemap and consolidate URLs over time; a migration does not
guarantee immediate index or ranking changes.

## Production release — 22 October 2026

Source commit: `e7d5d03` (pushed to `codex/curate-music-rosters`). Released on
`tierlistmaker.app` through production deployment
`dpl_9cZJcaNW7anbhGxtRUgR3HkKuQQS` after checking its protected production URL.
The Vercel production build completed in 48 seconds.

The public URL sweep verified all 126 current community aliases as HTTP 301,
all 126 descriptive destinations as HTTP 200 with no redirect chain, canonical
sitemap entries only, and representative category links/content/metadata.
The live browser followed `/template/b-ie9n` to
`/template/blox-fruits-fruits`, rendered the ranking studio, and reported no
console errors. Release error logs had no entries during verification.

The production build, TypeScript, slug contract suite, authenticated SQL
rollback suite, voting and catalog regression suites passed. Full repository
lint had zero errors and 25 existing warnings; focused lint on the new URL
code/tests had zero warnings. The local production readiness crawl passed all
160 public sitemap pages, canonical tags, structured data parsing, noindex
exclusions, unknown-category 404s, and image crawling rules.

The same readiness crawl also passed all 160 pages on the live public domain
after promotion. The working checkout retains its separate staging Vercel link;
production deployment and verification used the explicit production project.

Any rollback must retain slug-aware template resolution and the database
migration. An older deployment that only looks up database IDs cannot serve
the new descriptive URLs.
