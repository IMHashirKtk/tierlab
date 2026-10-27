# Crawl and quality release — 27 October 2026

## Task 1 — baseline and discovery

The baseline was reported before production code changes. [Ten random URLs, response evidence and discovery counts](seo/crawl-baseline-20261027.json) are retained here. All ten returned 200 with exact self-canonicals, zero redirects, no X-Robots-Tag and no challenge for normal curl and Googlebot/2.1. This does not prove that verified Googlebot IP traffic has never been challenged. Robots allows the site and references only the apex HTTPS sitemap. The homepage linked 15 distinct templates; gaming/anime stopped at 50 with no pagination; /templates was missing; /create explicitly had noindex.

Replaced truncated/browser-only discovery with a public, anonymous-RLS, server-only catalog. Stable database pagination reads every public record. Homepage, categories and /templates render ordinary anchors, with no more than 100 directory entries per page and linked pagination. /templates links every category. Browser drafts and sessions never enter these reads. The catalog revalidates after 300 seconds and expires after 600 seconds. A cloud read failure throws rather than publishing an incomplete cached cloud catalog.

Production configuration: changed www → apex redirectStatusCode from 308 to 301, preserving its destination. HTTP remains a hosting constraint: Vercel redirects HTTP to HTTPS with 308 before application routing. HTTP www therefore retains two hops. The strict all-aliases-one-301 requirement is **not satisfied** on the current architecture. [Vercel TLS documentation](https://vercel.com/docs/cdn-security/encryption). No DNS, TLS, DDoS or bot protections were weakened.

Firewall observations: Bot Protection off, AI bots allow, Attack Challenge Mode off. Platform DDoS mitigation was active; its aggregate challenge counts do not identify Googlebot.

Validation: production build, focused ESLint, and `node tests/crawl-directory-audit.mjs`. Built HTML was checked after removing script blocks: 257 templates discoverable, gaming 103 across two pages, anime 67, food 12, movies 40, music 5, sports 12, pop-culture 18.

Baseline performance on /template/elden-ring-bosses: initial scripts total 296,547 gzip bytes (289.6 KiB). One unthrottled desktop Chrome load recorded LCP 5,356 ms and TTFB 402 ms. This is a laboratory observation, not field/p75 data.

Each task has its own commit; use its file list as the authoritative change inventory.

## Task 2 — explicit indexability

Metadata and sitemap share `templateQuality`: at least eight named items, an explicitly reviewed 120–200-word intro, exactly three FAQs, and at least 200 editorial words. Unreviewed templates stay linked with noindex,follow and are absent from the sitemap. At this task boundary the registry is deliberately empty; Task 3 adds forty individual reviews. Generic Item #N rosters fail the gate.

Ten primary routes have distinct, visible server-rendered editorial copy of 200+ words: homepage, editor, directory, and seven categories. Other static informational pages and the as-yet-unverified comparison use noindex,follow. /create now qualifies for indexing; homepage remains the primary broad maker page. Paginated directories remain linked but noindex to avoid repeated editorial content.

Sitemap dates come from deterministic editorial revision strings, not build time or voting/publishing counters. Validation: successful build and focused lint; indexability-audit covers missing editorial, short rosters, generic names and dates; built sitemap has ten qualified static URLs at this task boundary. Catalog reads retry a transient failure once after an observed timeout; they do not turn missing cloud data into a successful incomplete sitemap.

## Task 3 — forty individually enriched templates

Added forty separately written intros (120–200 words each) and 120 topic-specific, permanently visible FAQs. Saved roster names and counts were checked through public read-only data before writing. Text explains the actual selection, useful ranking criteria and exclusions; it does not claim current game balance or franchise completeness. In particular, the Spider-Man selection includes related spin-offs; the Taylor Swift selection contains versioned entries; the Kanye-related selection mixes singles, editions and an associated release rather than a uniform solo-album catalog.

Template H1 is `{Topic} Tier List Template`; absolute titles use `{Topic} Tier List Maker (Free Template)` and are at most 60 characters. Removed repeated drag-and-drop boilerplate and generic Item #N captions. All roster names appear in visible server text and image alt attributes. Structured data matches the visible roster and FAQs. Related links use the full same-category catalog, prioritizing reviewed pages, plus category and editor links.

Inventory limitation: music has only five real templates, so its two enriched pages link four other music templates rather than inventing six. Other selected categories supply six related templates.

Only the editor is inside an aria-hidden skeleton Suspense boundary. An HTML regression test caught and prevented the whole editorial section being postponed with the editor. The intro is not loading content and survives hydration. Consensus renders nothing below five published submissions or on an error.

Validation: successful production build, focused lint, indexability audit, directory audit and template-editorial-audit. The latter checks all forty built HTML files with scripts stripped, exact titles, every roster name, all intros/FAQs, editor/category links and the forty template sitemap entries. Sitemap now has fifty qualified pages before comparison verification.
