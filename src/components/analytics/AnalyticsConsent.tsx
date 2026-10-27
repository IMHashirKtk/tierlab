"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  ANALYTICS_CONSENT_EVENT, ANALYTICS_PREFERENCES_EVENT,
  applyAnalyticsConsent, initializeAnalytics, readAnalyticsConsent, trackAnalyticsPage, updateAnalyticsConsent,
} from "@/lib/analytics";

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(ANALYTICS_CONSENT_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(ANALYTICS_CONSENT_EVENT, listener);
  };
}

const subscribeHost = () => () => {};
const isProductionHost = () => location.hostname === "tierlistmaker.app";
const serverHost = () => false;

export function AnalyticsPreferencesButton({ className, onOpen }: { className?: string; onOpen?: () => void }) {
  const enabled = useSyncExternalStore(subscribeHost, isProductionHost, serverHost);
  if (!enabled) return null;
  return <button type="button" className={className} onClick={() => { onOpen?.(); window.dispatchEvent(new Event(ANALYTICS_PREFERENCES_EVENT)); }}>Analytics preferences</button>;
}

export function AnalyticsConsent({ measurementId }: { measurementId: string }) {
  const enabled = useSyncExternalStore(subscribeHost, isProductionHost, serverHost);
  const consent = useSyncExternalStore(subscribe, readAnalyticsConsent, () => null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const pathname = usePathname();
  const initialized = useRef(false);
  const lastPage = useRef<string | null>(null);
  const preferencesRegion = useRef<HTMLElement>(null);

  useEffect(() => { if (preferencesOpen) preferencesRegion.current?.focus(); }, [preferencesOpen]);

  useEffect(() => {
    const open = () => setPreferencesOpen(true);
    window.addEventListener(ANALYTICS_PREFERENCES_EVENT, open);
    return () => window.removeEventListener(ANALYTICS_PREFERENCES_EVENT, open);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (consent !== "granted") {
      applyAnalyticsConsent("denied", measurementId);
      initialized.current = false;
      lastPage.current = null;
      return;
    }
    if (!pathname) return;
    // Initialize consent and configuration before fetching Google's library.
    if (!initialized.current) initialized.current = initializeAnalytics(measurementId);
    if (!initialized.current) return;
    if (!document.getElementById("tierlistmaker-ga4")) {
      const script = document.createElement("script");
      script.id = "tierlistmaker-ga4";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      script.onerror = () => script.remove();
      document.head.appendChild(script);
    }
    if (lastPage.current !== pathname) {
      trackAnalyticsPage(measurementId, pathname);
      lastPage.current = pathname;
    }
  }, [consent, enabled, measurementId, pathname]);

  function choose(value: "granted" | "denied") {
    if (!updateAnalyticsConsent(value, measurementId)) { setStorageError(true); return; }
    setStorageError(false);
    setPreferencesOpen(false);
    if (value === "denied") { initialized.current = false; lastPage.current = null; }
  }

  if (!enabled) return null;
  return <>
    {(consent === null || preferencesOpen) && <section ref={preferencesRegion} tabIndex={-1} role="region" aria-label="Analytics preferences" className="fixed bottom-4 left-4 right-4 sm:left-auto sm:w-[420px] z-[100] rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-sm text-zinc-300 shadow-xl">
      <h2 className="font-semibold text-white">Optional analytics</h2>
      <p className="mt-2 text-xs leading-relaxed">Allow Google Analytics to help us understand site visits and improve Tier List Maker? Analytics cookies stay off unless you allow them. You can change your choice in the Privacy &amp; Storage Hub.</p>
      <Link href="/privacy" className="mt-2 inline-block text-xs text-indigo-300 underline">Privacy policy</Link>
      {storageError && <p role="alert" className="mt-2 text-xs text-amber-300">Your browser could not save this choice. Analytics remains off.</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => choose("denied")} className="flex-1 rounded-lg border border-zinc-600 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800">No thanks</button>
        <button type="button" onClick={() => choose("granted")} className="flex-1 rounded-lg border border-indigo-500 bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500">Allow analytics</button>
      </div>
    </section>}
  </>;
}
