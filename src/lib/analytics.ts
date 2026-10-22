export const ANALYTICS_CONSENT_KEY = "tl_analytics_consent_v1";
export const ANALYTICS_CONSENT_EVENT = "tl-analytics-consent";
export const ANALYTICS_PREFERENCES_EVENT = "tl-analytics-preferences";
export type AnalyticsConsent = "granted" | "denied" | null;

declare global {
interface Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  [key: `ga-disable-${string}`]: boolean | undefined;
}
}

export function readAnalyticsConsent(): AnalyticsConsent {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch { return null; }
}

const deniedAdvertising = {
  ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
};

export function updateAnalyticsConsent(value: Exclude<AnalyticsConsent, null>, id: string): boolean {
  try { window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value); } catch { return false; }
  applyAnalyticsConsent(value, id);
  window.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT));
  return true;
}

export function applyAnalyticsConsent(value: Exclude<AnalyticsConsent, null>, id: string) {
  const target = window;
  target[`ga-disable-${id}`] = value !== "granted";
  // Only an already-loaded tag receives updates. A declined first visit never
  // loads Google's library or sends cookieless consent pings.
  target.gtag?.("consent", "update", { ...deniedAdvertising, analytics_storage: value });
  if (value === "denied") {
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=")[0].trim();
      if (name !== "_ga" && !name.startsWith("_ga_")) continue;
      const expiry = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
      document.cookie = expiry;
      document.cookie = `${expiry}; domain=${location.hostname}`;
      document.cookie = `${expiry}; domain=.${location.hostname}`;
    }
  }
}

export function initializeAnalytics(id: string): boolean {
  if (readAnalyticsConsent() !== "granted") return false;
  const target = window;
  target[`ga-disable-${id}`] = false;
  target.dataLayer ||= [];
  target.gtag ||= (...args: unknown[]) => { target.dataLayer!.push(args); };
  target.gtag("consent", "default", { ...deniedAdvertising, analytics_storage: "denied" });
  target.gtag("consent", "update", { ...deniedAdvertising, analytics_storage: "granted" });
  target.gtag("set", analyticsPage(location.pathname, location.origin));
  target.gtag("js", new Date());
  target.gtag("config", id, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  return true;
}

/** Exclude query strings, fragments, creator names and user-entered draft titles. */
export function analyticsPage(pathname: string, origin: string) {
  const cleanPath = pathname.split(/[?#]/)[0];
  const path = cleanPath.startsWith("/user/") ? "/user/profile" : cleanPath;
  const section = path.split("/")[1];
  const title = section ? `${section.charAt(0).toUpperCase()}${section.slice(1)} | Tier List Maker` : "Tier List Maker";
  return { page_location: `${origin}${path}`, page_title: title };
}

export function trackAnalyticsPage(id: string, pathname: string) {
  if (readAnalyticsConsent() !== "granted") return;
  const target = window;
  if (target[`ga-disable-${id}`]) return;
  let referrer = "";
  try { const url = new URL(document.referrer); referrer = analyticsPage(url.pathname, url.origin).page_location; } catch {}
  target.gtag?.("set", { ...analyticsPage(pathname, location.origin), page_referrer: referrer });
  target.gtag?.("event", "page_view", {
    send_to: id,
    ...analyticsPage(pathname, location.origin),
    page_referrer: referrer,
  });
}
