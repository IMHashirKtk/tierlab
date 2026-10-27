# Crawl and quality release — 27 October 2026

## Task 1 — baseline and discovery

The baseline was reported before production code changes. [Ten random URLs, response evidence and discovery counts](seo/crawl-baseline-20261027.json) are retained here. All ten returned 200 with exact self-canonicals, zero redirects, no X-Robots-Tag and no challenge for normal curl and Googlebot/2.1. This does not prove that verified Googlebot IP traffic has never been challenged. Robots allows the site and references only the apex HTTPS sitemap. The homepage linked 15 distinct templates; gaming/anime stopped at 50 with no pagination; /templates was missing; /create explicitly had noindex.

Replaced truncated/browser-only discovery with a public, anonymous-RLS, server-only catalog. Stable database pagination reads every public record. Homepage, categories and /templates render ordinary anchors, with no more than 100 directory entries per page and linked pagination. /templates links every category. Browser drafts and sessions never enter these reads. The catalog revalidates after 300 seconds and expires after 600 seconds. A cloud read failure throws rather than publishing an incomplete cached cloud catalog.

Production configuration: changed www → apex redirectStatusCode from 308 to 301, preserving its destination. HTTP remains a hosting constraint: Vercel redirects HTTP to HTTPS with 308 before application routing. HTTP www therefore retains two hops. The strict all-aliases-one-301 requirement is **not satisfied** on the current architecture. [Vercel TLS documentation](https://vercel.com/docs/cdn-security/encryption). No DNS, TLS, DDoS or bot protections were weakened.

Firewall observations: Bot Protection off, AI bots allow, Attack Challenge Mode off. Platform DDoS mitigation was active; its aggregate challenge counts do not identify Googlebot.

Validation: production build, focused ESLint, and `node tests/crawl-directory-audit.mjs`. Built HTML was checked after removing script blocks: 257 templates discoverable, gaming 103 across two pages, anime 67, food 12, movies 40, music 5, sports 12, pop-culture 18.

Baseline performance on /template/elden-ring-bosses: initial scripts total 296,547 gzip bytes (289.6 KiB). One unthrottled desktop Chrome load recorded LCP 5,356 ms and TTFB 402 ms. This is a laboratory observation, not field/p75 data.

Each task has its own commit; use its file list as the authoritative change inventory.
