# Technical SEO audit — 20 October 2026

Implemented, committed, pushed, and released to production on 20 October 2026. The review covered route layouts and metadata, public content queries, template/category rendering, discovery links, social and embed links, structured data, robots/sitemaps, PWA caching, and the main client bundles. The local production audit walked all 35 sitemap URLs: 7 static pages, 7 category hubs, and 21 templates. Browser checks also covered public profiles, navigation, the editor, and deferred dialogs.

## Production release result

- URL: [tierlistmaker.app](https://tierlistmaker.app/)
- Target/status: production / READY; project `tierlab-production`
- Application commit: `4c2ee47`; deployed source commit: `43f122c` (includes deployment input exclusions)
- Framework/build duration: Next.js 16.4.0 / 41 seconds
- Deployment: [`dpl_6pxEWzS2m73GeqRiKY24oyG4kNWZ`](https://vercel.com/hashirs-projects-57d66e99/tierlab-production/6pxEWzS2m73GeqRiKY24oyG4kNWZ)
- Tested with production environment settings before domain promotion; the workspace's existing staging link was preserved.
- After promotion, both the site-wide audit and live-readiness audit passed against the public domain: 35 sitemap pages, 40 internal path destinations, zero site-wide audit findings. The release-specific runtime error query returned no entries; this is a bounded check, not a guarantee about future runtime behavior.
- The live build's initial-script gzip total was 280,690 bytes. The local before/after comparison below remains the controlled comparison; deployment-generated bundles differ slightly.
- Long-term field Core Web Vitals monitoring and Search Console analysis remain operator follow-up work. No new monitoring drain was configured.

Leaked identifiers such as `titlematchScore`, `site2vecEmbedding`, `siteLinkIn`, `siteLinkOut`, `pnav`, `pnavClicks`, `impressions`, `chromeInTotal`, and `directFrac` are hypotheses for investigation, not confirmed ranking inputs or scores this application can measure. The implementation uses descriptive content, actual site entities, crawlable navigation, and less client code. No traffic generation, synthetic searches, click manipulation, or fabricated engagement was added.

## Findings and changes

| Area | Finding | Implemented change |
| --- | --- | --- |
| Titles and intent | Template titles combined long roster labels, “Tier List Maker & Ranking,” and another brand suffix. | Added editorial topic names to the 20 starter guides; template titles now follow “Elden Ring Bosses Tier List Template \| Tier List Maker.” Visible roster titles retain selection sizes and scope. Category titles describe the collection's search intent. |
| Headings | All 21 template pages lacked an H1. | Promoted the visible template overview to an H1, preserving its styling. Removed the internal “Indexed Roster” label in favor of “Template roster.” |
| Social metadata | Six information/comparison pages inherited the homepage's Open Graph title, image, and URL. | Added a shared metadata builder with matching document/social titles, descriptions, page URLs, and previews. |
| Canonicals | A canonical on the root layout could leak the homepage URL into child pages without an override. Embeds had no canonical override. | Scoped the homepage canonical to its page and assigned embeds to their original template/ranking, with a self URL for unavailable embeds. Utility pages remain noindex. |
| Topical content | Category descriptions mostly repeated the same generic template text. | Added seven distinct category introductions and ranking guides grounded in their actual subjects: patches and maps, story arcs and spoilers, album editions, player eras, and other useful comparison criteria. |
| Internal links | Some hero anchors implied a specific roster but went to a generic category. Card headings were plain text; action labels repeated “Rank This.” | Pointed hero topics to matching rosters, linked template headings, added descriptive accessible action names, linked category guidance to the creator guide, and linked template attribution to the operator or creator. Existing category and related-template navigation remains. |
| Brand/entity data | Global schema described only the app, and metadata named an unspecified team. | Connected `WebSite`, `WebApplication`, and the real operator `Person` using stable IDs. Added template `CreativeWork` relationships, category collection relationships, public ranking schema, and populated creator `ProfilePage` schema. No invented organization, awards, ratings, or social identities. |
| Roster schema | Template ItemList copy described a “complete roster,” even for selections. | Described the actual included items and explicitly marked the unranked template roster as unordered. |
| Public rendering | Shared rankings and creator profiles initially rendered loading screens and fetched their content in the browser. | Passed public server data into the existing interactive clients. Profile pages initially select templates when there are no rankings. Existing public visibility rules and voting paths remain in use. |
| Data reads | Metadata and page content could independently fetch the same record. | Added request-scoped React memoization for public template, ranking, and profile reads. No new persistent cache was introduced for moderated content. |
| Initial JavaScript | The homepage was entirely under a client boundary, including static sections; closed dialogs and confetti code loaded eagerly. | Made the homepage a server composition, kept static hero/categories server-rendered, and deferred publishing, global storage UI, and confetti until requested. |
| Images and interaction | Image decoding/loading and search requests could compete with more useful work. | Defaulted item thumbnails to lazy loading and asynchronous decoding, with caller overrides retained. Debounced navbar and catalog searches by 250 ms. Existing sized image containers remain. |

## Measured results

| Check | Before | After |
| --- | ---: | ---: |
| Sitemap pages audited | 35 | 35 |
| Audit findings | 27 | 0 |
| Templates missing H1 | 21 | 0 |
| Information pages with mismatched social titles | 6 | 0 |
| Initial homepage script payload, gzip | 301,941 bytes | 280,454 bytes |

The initial script payload decreased by 21,487 bytes (7.1%). This sums gzip-compressed JavaScript referenced by script tags in the homepage HTML. It excludes later dynamic imports, link prefetches, fonts, images, and other requests; it is not a Lighthouse score or a measured reduction in field LCP/INP.

The final audit verified 40 internal path destinations plus fragments, unique titles/descriptions, one H1 per sitemap page, matching canonicals and social titles, JSON-LD syntax, and at least one inbound link from another sitemap page. There were already no sitemap orphans before the changes; the internal-link work improved context and destinations rather than claiming an orphan-count reduction.

Validation passed: production build/TypeScript; lint on changed routes and components; launch SEO, starter catalog, image URL, community voting, live readiness, and site-wide URL audits. Browser checks confirmed the publisher and storage hub open after lazy loading, template headings render, populated profiles expose their template links, and the gaming hub/mobile navigation work at 390 px without document overflow. A nested template streaming boundary introduced during implementation produced a production hydration mismatch; that change was reverted and the final production template was retested without new React errors.

Raw snapshots: `tests/seo/sitewide-baseline.json` and `tests/seo/sitewide-report.json`. Run the read-only regression audit against a local production server:

```powershell
$env:AUDIT_BASE_URL = 'http://localhost:3012'
node tests/sitewide-seo-audit.mjs
node tests/live-readiness-audit.mjs
```

## Existing protections retained and limitations

- Preview/staging indexing controls, noindex utility pages and empty profiles, public asset crawl allowances, test-content filtering, category 404s, honest sitemap dates, escaped JSON-LD, next/font, fixed-size thumbnail containers, and reduced-motion support were already present.
- No HTTP outbound links appeared in the rendered sitemap-page audit. The source review found X/Reddit sharing intents and embed attribution links. Sharing intents are user actions, and new-tab share links already use `noopener noreferrer`. No blanket nofollow or artificial authority links were added. Published comments render text rather than arbitrary HTML links.
- Public shared rankings were not added to the sitemap. No genuine public rankings were available for a real-data rendering check; no new production audit content was published. The existing mocked voting tests passed, but a future ranking's publishing/share/export workflow should be tested in staging.
- Unknown dynamic templates/rankings can still produce a streamed response with noindex instead of an early HTTP 404. Categories already have an early 404 guard. Strict dynamic 404 handling requires a deliberate route/data-boundary change and should be verified against this Next.js version before rollout.
- Current category discovery reads up to 50 cloud records and the sitemap reads up to 500. Add pagination and sitemap partitioning as the genuine catalog approaches these limits; the current audited catalog is below both.
- The build emitted the existing out-of-repository lockfile warning and a sitemap database fallback warning during prerendering. The running production audit subsequently returned and verified all 35 public URLs, including cloud-only templates. Monitor public data query failures after deployment.
- Structured data was checked for syntax and consistency with content, not certification of Google rich-result eligibility. An app/FAQ/ItemList does not imply a guaranteed rich result.

## Actions outside the codebase

1. **Maintain release verification.** This release is deployed and both live audits passed. The live homepage's canonical is `https://tierlistmaker.app`, it permits indexing, and `www` redirects to the apex. Repeat the URL audit after future releases and monitor indexing after Google recrawls the changed pages.
2. **Use actual Search Console query data.** Verify ownership, submit the sitemap, and inspect the homepage, each category, and representative starter/user templates. Compare query/page clicks, impressions, CTR, and average position over comparable 28-day windows. Segment branded versus nonbranded queries and device types. The title changes here are based on page subjects and intent, not unavailable query-volume or ranking data.
3. **Measure real Core Web Vitals.** Check PageSpeed Insights and Search Console after deployment. Target p75 LCP at or below 2.5 s, INP at or below 200 ms, and CLS at or below 0.1. Local payload and rendering checks do not establish production field scores. Prioritize the slowest template/category groups and compare after enough real-user data accumulates.
4. **Expand useful editorial content.** Review rosters for accuracy, scope, outdated entries, and permitted subject artwork. Add original comparison guidance and maintain it when games, releases, or products change. Cite authoritative subject sources when they help explain a roster; do not add irrelevant outbound links merely to chase an inferred metric.
5. **Earn brand demand and references.** Use the same name/domain in genuine creator profiles, tutorials, community participation, and relevant mentions. Demonstrate a useful workflow people want to revisit or bookmark. Avoid paid link schemes, compulsory keyword-rich backlinks, incentivized branded searches, and fake direct visits.

## Evidence behind the approach

- [Google: title links](https://developers.google.com/search/docs/appearance/title-link) — concise, descriptive titles consistent with visible content.
- [Google: crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) — real anchors and descriptive contextual text.
- [Google: site names](https://developers.google.com/search/docs/appearance/site-names) — consistent branding and WebSite data.
- [Google: canonicalization](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) — consistent canonicals, links, and sitemap URLs.
- [Google: structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) — accurate visible content and no guaranteed rich results.
- [Google: Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals) — field measurement and experience targets.
