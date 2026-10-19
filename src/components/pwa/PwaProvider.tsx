"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { PrivacyStorageModal } from "@/components/privacy/PrivacyStorageModal";

interface PwaContextType {
  isOnline: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<boolean>;
  isPrivacyModalOpen: boolean;
  openPrivacyModal: () => void;
  closePrivacyModal: () => void;
}

const PwaContext = createContext<PwaContextType>({
  isOnline: true,
  isInstallable: false,
  isInstalled: false,
  promptInstall: async () => false,
  isPrivacyModalOpen: false,
  openPrivacyModal: () => {},
  closePrivacyModal: () => {},
});

export function usePwa() {
  return useContext(PwaContext);
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function getOnlineServerSnapshot() {
  return true;
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const isOnline = React.useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  });
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // 1. Service Worker registration & PWA prompt listeners
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register Service Worker
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV !== "production") {
        // Next dev reuses chunk URLs. Caching them can mix old client code
        // with fresh server HTML and break hydration during local work.
        void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
          await Promise.all(registrations.filter((reg) =>
            reg.active?.scriptURL === new URL("/sw.js", location.origin).href
          ).map((reg) => reg.unregister()));
          if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.filter((key) => key.startsWith("tierlistmaker-pwa-")).map((key) => caches.delete(key)));
          }
        }).catch(() => {});
      } else {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((reg) => {
          // Listen for updates
          reg.onupdatefound = () => {
            const installing = reg.installing;
            if (installing) {
              installing.onstatechange = () => {
                if (installing.state === "installed" && navigator.serviceWorker.controller) {
                  // New version available
                  console.info("Tier List Maker: New offline shell available.");
                }
              };
            }
          };
        })
        .catch((err) => {
          console.debug("ServiceWorker registration skipped or failed:", err);
        });
      }
    }

    // Listen for BeforeInstallPrompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setIsInstallable(true);
    };

    // Listen for App Installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      deferredPromptRef.current = null;
    };

    // Listen for custom global event to open privacy modal from anywhere
    const handleCustomOpenPrivacy = () => {
      setIsPrivacyModalOpen(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("open-privacy-storage", handleCustomOpenPrivacy);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("open-privacy-storage", handleCustomOpenPrivacy);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) return false;

    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    deferredPromptRef.current = null;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setIsInstallable(false);
      return true;
    }
    return false;
  };

  const openPrivacyModal = () => setIsPrivacyModalOpen(true);
  const closePrivacyModal = () => setIsPrivacyModalOpen(false);

  return (
    <PwaContext.Provider
      value={{
        isOnline,
        isInstallable,
        isInstalled,
        promptInstall,
        isPrivacyModalOpen,
        openPrivacyModal,
        closePrivacyModal,
      }}
    >
      {children}

      {/* Global Offline Banner */}
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-amber-950/95 border border-amber-500/50 text-amber-200 px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 max-w-[90vw]"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
          <span>⚡ Offline Mode Active — All edits and images are saved locally to your device.</span>
          <button
            onClick={openPrivacyModal}
            className="ml-2 underline text-amber-300 hover:text-white cursor-pointer font-semibold flex-shrink-0"
          >
            Storage Hub
          </button>
        </div>
      )}

      {/* Global Privacy & Device Storage Modal */}
      <PrivacyStorageModal
        isOpen={isPrivacyModalOpen}
        onClose={closePrivacyModal}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        onInstall={promptInstall}
      />
    </PwaContext.Provider>
  );
}
