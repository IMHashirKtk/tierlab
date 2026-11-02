# Template journey and discovery review — 2 November 2026

Prepared against the supplied 1 November GSC audit. These changes are local and uncommitted for review. No push, deployment, GSC submission, database migration or reminder was performed. The supplied search baseline was not reinterpreted as a growth trend or ranking forecast.

## Implemented behavior

Contextual template links now use the existing stable-ID loader at `/create?template=…`. Both shared detail-page CTAs and the inline editor's separate-page link retain context. Global navigation says “New blank board.” Invalid, deleted or unavailable templates show recovery links instead of silently creating an empty board. A saved-project ID takes precedence over a template query. Failed project loads cannot autosave an empty replacement; storage schemas and existing drafts are unchanged.

Homepage discovery contains 12 reviewed featured cards, with the three cohort pages first. Catalog and category pages contain at most 24 cards, each with four representative, lazy-loaded previews with reserved dimensions and real alt text. Full rosters remain on detail pages. Pagination remains server-rendered links, including direct numbered URLs. Indexed first-page hubs contain a native, keyboard-operable disclosure linking all their reviewed templates. No priority reviewed template relies exclusively on later archives for discovery.

## Explicit indexing policy

Public discoverability is separate from indexing. Curated and community templates use the same quality gate: discoverable/public status, at least eight genuinely named items, a registered topic-specific editorial entry with a 120–200-word intro, at least 200 editorial words in total, and exactly three FAQs. Origin alone does not grant eligibility. Unreviewed entries remain linked in discovery but receive `noindex, follow` and are excluded from XML. This is a deterministic editorial gate, not an automated assertion of originality.

The sitemap remains 50 URLs: 10 primary pages and 40 eligible template details. Later catalog/category archives deliberately retain `noindex, follow` with self-canonicals; they link all 257 public template paths. First-page hub shortcuts give the reviewed cohort direct indexed-hub links. Eligibility and archive exclusions have regression checks. Deterministic lastmod dates reflect the changed home, catalog, categories and cohort scope notes; unrelated dates were preserved. Robots rules allowing image/OG API paths were preserved.

All three cohort URLs return 200, declare their stable public canonical, allow indexing, retain full server-visible named rosters and editorial content, and have category links. No mass title changes or additional sitemap templates were introduced.

### Cohort scope

* Valorant: 29 saved agent cards. A visible scope note discloses that Hush is excluded rather than claiming current completeness. Hush was present in [Riot's official agent directory](https://playvalorant.com/en-us/agents/) when checked on 2 November 2026. No live balance or match statistics are claimed.
* Pokémon: 27 named starter cards. Scope explicitly excludes Pikachu/Eevee and separately named evolved/regional forms; it does not claim every possible first partner or complete current-generation coverage.
* Fast food: 40 selected chain/brand cards across several food types. Scope does not claim a complete country directory; users are prompted to state their market and leave unfamiliar chains unranked.

No artwork was added. Existing image ownership/licensing remains unverified and needs an asset provenance review before making rights claims.

## Production baseline versus local production-build candidate

Measured 2 November with `curl`, explicit `Accept-Encoding: gzip`, saved response bodies, decompression and script-stripped initial HTML counts. These are document-body bytes, excluding headers, images and JavaScript files. Candidate measurements are **localhost**, not a deployed production-after result.

| Page | HTML bytes before → candidate | Gzip body bytes before → candidate | Initial images | Initial elements |
| --- | ---: | ---: | ---: | ---: |
| `/` | 918,495 → 147,788 (−83.9%) | 92,029 → 23,276 | 753 → 50 | 3,261 → 705 |
| `/templates` | 898,455 → 187,866 (−79.1%) | 87,955 → 24,151 | 753 → 86 | 2,952 → 691 |
| `/categories/gaming` | 900,574 → 184,544 (−79.5%) | 87,118 → 23,227 | 769 → 94 | 2,955 → 668 |

Browser DOM counts also fell: home 3,411 → 761; catalog 3,102 → 747; gaming 3,112 → 726. Browser counts include hydration and are distinct from initial-element counts above. All measured mobile documents had no horizontal overflow. Images are lazy, so image count is not a request count.

### Mobile lab observations and limitations

Chrome, 390×844 CSS pixels. Requested settings: 150 ms latency, 1.6 Mbps download, 0.75 Mbps upload, 4× CPU slowdown, cache disabled and service-worker bypass. Buffered browser LCP/CLS observations were collected; this was not Lighthouse or field CWV. The existing localhost browser zoom is 80%, requiring a 312×675 viewport override to obtain 390×844 CSS pixels; production used a 390×844 override. Browser integration/navigation behavior and varying response compression prevented a strictly controlled paired benchmark. All temporary overrides were restored.

| Page | Production baseline LCP | Final local candidate LCP | Final candidate CLS |
| --- | ---: | ---: | ---: |
| Home | 3,472 ms | 9,424 ms | 0.0029 |
| Catalog | 2,624 ms | 528 ms | 0 |
| Gaming | 3,208 ms | 652 ms | 0 |

These inconsistent timings **do not establish a speed improvement or a CWV pass**. Earlier local observations were 3,024 / 4,576 / 2,676 ms respectively; the catalog observation included 2,090 ms TTFB. Initial baseline home/catalog runs while build/lint were active exceeded 10 seconds; those and one wrong-width capture are retained in raw records but excluded from the baseline table. The table uses the final idle, correct-width production observations and the final candidate capture, without hiding its slow homepage. Repeat a controlled mobile Lighthouse/WebPageTest run on the deployed candidate and obtain field data before setting a performance conclusion. No INP, whole-page transfer or non-editor JS budget pass is claimed.

## Consent-respecting product measurement

Existing production-apex-only GA4 and explicit opt-in remain in place. New aggregate events:

| Event | Trigger | Allowed fields |
| --- | --- | --- |
| `template_open` | Inline editor request or actual separate-page template-loader attempt, including bookmarks/direct visits | `start_type`, `entry_point` (`inline` / `separate_page`) |
| `editor_ready` | Editor hydration succeeds, or template/project loading fails | `start_type` (`blank` / `template` / `project`), `result`, bounded `reason` |
| `export_completed` | Successful image/video generation followed by the download action | `start_type`, `format` (`image` / `video`) |

Runtime allowlists discard extra fields. No template/project identifiers, user titles, item text, images or draft contents are sent. A bounded initialization queue accepts only already-consented events and is cleared on withdrawal. Localhost emits no analytics. An export event indicates download initiation after rendering, not proof of OS-level file persistence. Compare ready success/failure separately from template-open → ready completion to expose abandonment. Search impressions/clicks remain separate measures. GA4 ingestion/realtime reporting awaits deployment and consented production usage.

## Validation

Production-mode Next build completed successfully. Full ESLint: 0 errors, 24 existing warnings; focused changed-file lint passed. `git diff --check` passed. Node regression audits passed: template-entry (unit and built HTML), cohort quality, directory crawl, indexable HTML, indexability, existing editorial content, analytics consent, and product events. Actual HTTP traversal checked all hub/category pagination: catalog 11 pages; gaming 5; anime 3; movies 2; remaining categories 1 each. All 257 template paths remain discoverable; unknown category pagination returns 404. All 50 sitemap entries match exact canonicals and remain indexable with no forbidden empty-state/profile text.

Local browser checks passed:

* Contextual and inline starts: Valorant 29, Pokémon 27, fast food 40 items, matching each server roster. Final contextual Valorant smoke test again loaded its title and 29 items; built-in Elden Ring also loaded its 10-item selection.
* Blank start: untitled, zero items. A separate saved QA draft retained its original title/item after template starts and after reopening with a conflicting template query.
* Invalid template and missing project: intelligible recovery, no silently substituted empty board or failed-project autosave.
* Keyboard quick assignment moved A&W to S. Mobile assignment controls moved Arby's to A at 390 CSS pixels.
* PNG export completed in Chrome: 855,769 bytes, 2160×2678; the rendered PNG was visually inspected for the title and assigned items.
* Narrow and wide catalog layouts had no horizontal overflow; final catalog page 11 contained 17 cards and the wide first page 24. Native reviewed-template disclosure worked with Space. Representative visible preview images loaded.

Physical touch drag, backup-file import/restore, full video rendering, exhaustive image-rights verification, every possible editor control and field CWV were not verified. Local QA projects were used without publishing or clearing user storage. The browser proof is [template-start.png](template-start.png). Measurements and checks are recorded in [measurements.json](measurements.json).

## Changed files

Routing: `src/app/create/page.tsx`, `src/lib/editor-start.ts` (new), `src/components/TemplateStartLink.tsx` (new), `src/app/template/[id]/page.tsx`, `src/app/template/[id]/TemplateClientLoader.tsx`, `src/components/Navbar.tsx`, `src/components/Footer.tsx`.

Discovery/quality: `src/app/page.tsx`, `src/components/CatalogPage.tsx`, `src/components/TemplateCover.tsx`, `src/components/TemplateDirectory.tsx`, `src/lib/directory.ts`, `src/data/template-cohort.ts` (new), `src/lib/indexability.ts`, `src/lib/page-quality.ts`.

Draft safety/events: `src/components/studio/Studio.tsx`, `src/components/studio/CreatorExportModal.tsx`, `src/components/studio/VideoExportModal.tsx`, `src/lib/analytics.ts`.

Tests: `tests/crawl-directory-audit.mjs`, plus new `tests/template-entry-audit.mjs`, `tests/cohort-quality-audit.mjs`, `tests/discovery-live-audit.mjs`, `tests/product-events-audit.mjs`. This report, measurements and proof image are under `docs/seo-2026-11-02/`.

## Follow-up after a separately authorized deployment

Record its actual date and changed URLs (home, catalog/category archives and hubs, three cohort details and shared template/editor entry points). On D+7 inspect the cohort and real errors/usage; D+14 review indexed cohort coverage, template-query impressions, ready rates and exports; D+28 compare equal complete periods. Use the latest complete GSC dates, stating exact windows and the sparse October baseline. Obtain image rights/provenance and demonstrate useful templates in relevant communities where appropriate. No ranking promise, paid-link campaign or bulk page expansion follows from this baseline.
