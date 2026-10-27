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

## Task 4 — homepage and global navigation

Empty ranking feeds render nothing until real submissions exist; consensus requires five submissions. Removed the placeholder creator-profile link from desktop and mobile navigation. Editor links now use action labels, and the homepage meta description accurately promises watermark-free exports: both image and video badges are off by default and optional at no charge.

Public catalog responses now use the framework's shared 300-second fetch cache and larger database batches to avoid redundant prerender round trips. Failures still fail the build rather than silently dropping community pages.

Validation: production build, focused ESLint, all forty editorial HTML checks, and an audit of every sitemap page for exact canonical, index permission and forbidden empty-state/placeholder text.

## Task 5 — sourced comparison, deliberately noindex

Replaced the short promotional page with a six-feature comparison table and practical workflow guidance. TierMaker claims are scoped to its official FAQ and one public builder, checked 27 October 2026. The FAQ documents logo-free/ad-free subscription benefits and account requirements for creating templates; its refresh warning is explicitly limited to its single-use private workflow. Public-builder image download controls are visible, but actual export extensions, video availability and broader draft behaviour remain unverified. These are labelled, not guessed. The page explicitly remains noindex,follow and outside the sitemap until verification is complete.

Sources: https://tiermaker.com/blog/support/10/tier-list-template-creation-guide-and-faqs and https://tiermaker.com/create/star-wars-film-ranking-6747 . No claim is made about competitor audience, speed, ranking or superiority.

Own-product claims were checked against current export defaults, local project storage and advertising integrations. Validation: production build, focused lint, and built-HTML checks for six table rows, dated sources, explicit noindex and sitemap exclusion.

## Task 6 — performance and release validation

The template page now loads the full drag-and-drop studio only when the visitor opens it. The original editor and export tools remain available, and a normal link opens the same template in /create. The permanent server-rendered intro, complete named roster and FAQs do not depend on editor hydration. The studio's loading box is aria-hidden. Global search now requests six compact public results from a server endpoint instead of bundling the database client and catalog in the navbar. Consensus uses a public server endpoint and renders nothing below five genuine published submissions; its sample is explicitly the latest 100 submissions. A fixed local SVG logo uses a native image, avoiding the image-loader client runtime.

Only forty reviewed template landing pages are prebuilt; the other public templates remain linked and render on demand with noindex. This reduces build work without changing the indexability policy.

Release checks independently confirmed registry security advisories for the pre-existing Next.js 16.4.0 dependency. The first unpromoted candidate was therefore superseded with a 16.4.3 patch candidate, including the matching ESLint configuration. Sources: https://github.com/advisories/GHSA-2464-fhr4-w9xw , https://github.com/advisories/GHSA-673q-mjm6-r5xr , https://github.com/vercel/next.js/releases/tag/v16.4.3 . No claim is made that the site had been exploited.

Live verification also caught two integration issues that static files alone cannot prove: the existing category proxy rejected valid /page/2 paths, and two multiline navbar links retained automatic prefetch. Both are now covered by regression checks. The editor has permanent resource links even before JavaScript executes. Speculative prefetch of editor, projects and versus routes is disabled in global navigation; template landing links also avoid preloading the heavier homepage.

A real browser verified public search results, opening the deferred editor, assigning Malenia to S, local autosave and opening image export with the watermark off. The browser download-event check timed out, and an older standalone video audit could not launch its browser in this environment; neither is represented as a passing end-to-end download test. The export implementation itself was preserved.


### Measured production performance

Initial first-party external script files on all three sampled templates: 190,973 gzip bytes (186.5 KiB), versus 296,547 (289.6 KiB) before: 35.6% reduction. This same-basis total includes the 39,627-byte legacy nomodule polyfill. Modern browsers skip it, leaving 151,346 gzip bytes (147.8 KiB). **The under-100-KB target is not met.** The two core React/Next runtime files alone exceed that budget. A leaner landing-page runtime/architecture remains further work; no framework bytes have been omitted to claim success. Inline hydration data, CSS, images and optional third-party GA4 are outside this script-file comparison. Actual browser request inspection confirmed no editor bundles load before activation after the prefetch fix.

| Template | Desktop LCP | TTFB |
|---|---:|---:|
| /template/elden-ring-bosses | 2.248 s | 371 ms |
| /template/overwatch-heroes | 1.628 s | 1062 ms |
| /template/blox-fruits-fruits | 0.908 s | 515 ms |

These are individual unthrottled desktop Chrome observations at 1536 × 730, using the existing browser profile and cache, after fonts settled. The baseline Elden Ring observation was 5.356 s. Each sampled result is below 2.5 s, but these measurements do not establish mobile, cold-cache, field p75, INP or ongoing Core Web Vitals compliance. No browser storage or consent preference was cleared to manufacture a score.

Final production deployment: dpl_ALfQxo6WYqniRYjTJHoMMzWWkrR2, https://tierlab-production-1rjgcvqha-hashirs-projects-57d66e99.vercel.app . Root .vercel remains linked to staging; the production release used an explicit production project ID. Builds and checks were run after every task. The final build uses Next.js 16.4.3, and registry audit reports zero known production dependency vulnerabilities.


### Final production crawl proof

All fifty sitemap URLs returned 200 to Googlebot/2.1, without redirects, with exact canonical equality, index permission, initial HTML internal anchors, no X-Robots-Tag restriction and no challenge response. Ten additional random ordinary-UA requests also passed. UA spoofing is not verified Googlebot IP evidence. No empty UGC state, generic Item #N label or placeholder creator-profile link appeared in indexable HTML. The verification file for Search Console remains byte-for-byte intact.

The directory and category pagination exposes all 257 templates without executing JavaScript: gaming 103, anime 67, food 12, movies 40, music 5, sports 12, pop-culture 18. The sitemap contains ten qualified primary pages plus forty individually reviewed templates. Unreviewed templates and the comparison remain linked but noindex and excluded from the sitemap. All 237 currently migrated legacy URLs were separately checked: 301 to descriptive destination, then 200.

| Random production sitemap URL | Normal / Googlebot | Canonical equals URL | Redirects | X-Robots-Tag | Initial internal links |
|---|---|---|---:|---|---:|
| https://tierlistmaker.app/template/jujutsu-kaisen-characters | 200 / 200 | Yes | 0 | Absent | 36 |
| https://tierlistmaker.app/template/harry-potter-movies | 200 / 200 | Yes | 0 | Absent | 36 |
| https://tierlistmaker.app/template/disney-movies | 200 / 200 | Yes | 0 | Absent | 36 |
| https://tierlistmaker.app/template/league-of-legends-jungle-champions | 200 / 200 | Yes | 0 | Absent | 36 |
| https://tierlistmaker.app/template/naruto-characters | 200 / 200 | Yes | 0 | Absent | 36 |
| https://tierlistmaker.app/template/league-of-legends-mid-champions | 200 / 200 | Yes | 0 | Absent | 36 |
| https://tierlistmaker.app/template/spider-man-movies | 200 / 200 | Yes | 0 | Absent | 36 |
| https://tierlistmaker.app/template/dead-by-daylight-killers | 200 / 200 | Yes | 0 | Absent | 36 |
| https://tierlistmaker.app/template/car-brands | 200 / 200 | Yes | 0 | Absent | 36 |
| https://tierlistmaker.app/template/risk-of-rain-2-survivors | 200 / 200 | Yes | 0 | Absent | 36 |

Raw before/after evidence is in docs/seo. [Changed files by task](seo/changed-files-20261027.md) lists each commit’s scope.

### Remaining constraints and off-site action

- Strict redirect requirement remains unmet on Vercel: HTTP apex is 308 → 200; HTTPS www is 301 → 200; HTTP www is 308 → 301 → 200. The HTTPS-www setting was corrected; achieving one 301 for all HTTP aliases would require a different upstream routing arrangement.
- JavaScript remains above the strict 100-KB target. The recorded desktop LCP samples pass 2.5 s; mobile/cold-cache and field performance are unverified.
- Music supplies four real related templates per page, not six; adding two distinct, worthwhile music rosters is content work.
- TierMaker export extension, video support and broader draft behaviour still need direct verification. The comparison stays noindex until then.
- Real Googlebot-IP challenge history and Google indexing/ranking outcomes have not been established. Use GSC to request recrawls of upgraded key pages, then assess actual coverage and queries after Google processes the sitemap. Obtain real community participation and relevant editorial mentions through normal audience outreach; no traffic or ranking signals were fabricated.
- End-to-end export downloads were not verified in this run; editor controls, ranking and autosave were verified in Chrome. One local audit draft was created, without public publishing.
