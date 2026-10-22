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
