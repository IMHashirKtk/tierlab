# Google Analytics 4

The operator supplied measurement ID `G-EB8LN74C3Q` for the web stream
`tier list maker web` (`16182888388`), URL `https://tierlistmaker.app`.
The property reporting URL uses account `118666360`, property `560115426`.

The root layout mounts optional analytics in indexable Vercel production
deployments. Collection is additionally restricted to `tierlistmaker.app` in
the browser, so localhost, staging, and protected deployment hosts cannot
pollute production reports. The public measurement ID is not a secret.

Visitors choose **Allow analytics** or **No thanks**. Google's script is not
requested before consent, including on a first visit that declines. The
device stores its choice under `tl_analytics_consent_v1`. Analytics preferences
can be reopened from the footer or Privacy & Storage Hub. Withdrawal disables
the property, updates Google's consent state, and expires GA cookies without
removing application drafts. Storage changes also revoke consent across tabs.

The initialization queue sets advertising storage, ad user data, and ad
personalization to denied. Google Signals and ad personalization signals are
disabled. Page views omit query strings, fragments, creator profile names,
and user-entered titles. Local draft contents and typed form values are never
passed to the tag. Removing queries also excludes UTM campaign parameters
from these page-view URLs; search/referral hosts still support channel reporting.

## Page views

Enhanced measurement is **off** in the web stream. Keep it off while the app
emits manual `page_view` events. The tag config sets `send_page_view: false`;
the app sends the initial page view and one view for each pathname change,
including client navigation. Query-only changes do not create extra views.
Re-enabling automatic history events can double-count navigation and collect
additional link/form data. Standard GA4 session and engagement processing
still applies after consent.

The Google script loads asynchronously after hydration and consent. No
Measurement Protocol secrets, server-side visit simulation, or extra tag
manager container are needed for this integration.

## Verification

`node --experimental-strip-types tests/analytics-audit.mjs` checks default-off
collection, consent transitions, event configuration, safe page metadata,
withdrawal, and draft-safe cookie cleanup without contacting Google.

For live verification, check no Google script is present before consent or
after an initial decline, allow analytics, navigate to another public page,
and inspect the target property's Realtime report. Normal reports can take
time to process. A visit blocked by an ad blocker or declined consent is
intentionally absent from GA4.

## Verified production release — 22 October 2026

Released source `e05dec9` (integration `c6af634` plus the verified Google command
queue correction) through production deployment
`dpl_5kZ2V3vW4cj6x55G9adGR7ptAjNo`. Vercel built it successfully in 26 seconds.
Both commits are pushed to `codex/curate-music-rosters`.

Live verification confirmed:

- Decline and reload: zero Google tag scripts loaded.
- Privacy Hub opens analytics preferences and closes its focus-trapped dialog.
- Allow: exactly one Google script loads for `G-EB8LN74C3Q`.
- Home and client navigation to About: one `page_view` per pathname, both
  accepted by Google's collection endpoint with HTTP 204.
- GA4 Realtime showed 1 active user and 2 page views, plus `first_visit` and
  `session_start` events from that real browser test.
- Withdrawal disabled the property, removed GA cookies, and left the page-view
  queue at 2 instead of emitting another page view.

The live test caught and corrected an important external API requirement:
Google's gtag command queue requires JavaScript `Arguments` objects. Plain rest
parameter arrays can leave the script loaded without processing its commands.
The regression suite now explicitly checks that contract.

Production build/TypeScript, focused lint, analytics consent/event tests,
sitemap/indexability tests, and community slug regression tests passed.
The screenshot proof is saved locally at `tests/.tmp-ga4-realtime.jpg`.
