"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  HardDrive,
  Download,
  Upload,
  Trash2,
  Sparkles,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  FileJson,
  Zap,
  Lock,
} from "lucide-react";
import {
  getStorageEstimate,
  exportAllData,
  importAllData,
  clearAllProjects,
} from "@/lib/storage";

interface PrivacyStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable?: boolean;
  isInstalled?: boolean;
  onInstall?: () => Promise<boolean>;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = bytes / Math.pow(k, i);
  return `${val < 10 && i > 0 ? val.toFixed(1) : Math.round(val)} ${sizes[i]}`;
}

export function PrivacyStorageModal({
  isOpen,
  onClose,
  isInstallable = false,
  isInstalled = false,
  onInstall,
}: PrivacyStorageModalProps) {
  const [stats, setStats] = useState<{
    usedBytes: number;
    quotaBytes: number;
    projectCount: number;
    itemCount: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const estimate = await getStorageEstimate();
      setStats(estimate);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStats();
      setShowConfirmClear(false);
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExportBackup = async () => {
    try {
      const json = await exportAllData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `tierlistmaker-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage({
        type: "success",
        text: "Backup exported successfully! All projects and rankings downloaded.",
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: `Export failed: ${err.message || "Unknown error"}`,
      });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const res = await importAllData(text);
      await loadStats();
      setStatusMessage({
        type: "success",
        text: `Restored ${res.restoredProjects} project(s) to device storage!`,
      });
      window.dispatchEvent(new Event("tierlistmaker-data-synced"));
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: `Import failed: Invalid backup file format.`,
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      await clearAllProjects();
      if (typeof window !== "undefined") {
        localStorage.removeItem("tl_published_rankings");
      }
      await loadStats();
      setShowConfirmClear(false);
      setStatusMessage({
        type: "info",
        text: "Device storage cleared. All local drafts have been purged.",
      });
      window.dispatchEvent(new Event("tierlistmaker-data-synced"));
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: `Failed to clear storage: ${err.message || "Unknown error"}`,
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleInstallClick = async () => {
    if (!onInstall) return;
    setIsInstalling(true);
    try {
      await onInstall();
    } finally {
      setIsInstalling(false);
    }
  };

  const usedPercentage =
    stats && stats.quotaBytes > 0
      ? Math.min(100, Math.max(0.5, (stats.usedBytes / stats.quotaBytes) * 100))
      : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 p-[1.5px] shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <h2
                id="privacy-modal-title"
                className="text-lg font-bold text-white flex items-center gap-2"
              >
                <span>Privacy & Device Storage Hub</span>
                <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                  100% Local-First
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Your images and rankings are stored in your browser sandbox, not in the cloud.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-850 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
          {/* Status Message Notification */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
                statusMessage.type === "success"
                  ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                  : statusMessage.type === "error"
                  ? "bg-rose-950/40 border-rose-500/30 text-rose-300"
                  : "bg-indigo-950/40 border-indigo-500/30 text-indigo-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {statusMessage.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {statusMessage.type === "error" && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                {statusMessage.type === "info" && <Zap className="w-4 h-4 text-indigo-400" />}
                <span>{statusMessage.text}</span>
              </div>
              <button
                onClick={() => setStatusMessage(null)}
                className="text-xs opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          )}

          {/* Section 1: Storage Health & Browser Quota */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-zinc-200">
                  Browser IndexedDB Allocation
                </span>
              </div>
              <button
                onClick={loadStats}
                disabled={isLoading}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Refresh Storage Usage"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Storage Meter Bar */}
            <div className="space-y-1.5 mb-4">
              <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(1, usedPercentage)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-zinc-400 font-mono">
                <span>
                  Used:{" "}
                  <strong className="text-zinc-200">
                    {stats ? formatBytes(stats.usedBytes) : "..."}
                  </strong>
                </span>
                <span>
                  Browser Quota:{" "}
                  <strong className="text-zinc-200">
                    {stats && stats.quotaBytes > 0 ? formatBytes(stats.quotaBytes) : "Unlimited"}
                  </strong>
                </span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-2.5">
                <span className="block text-[11px] text-zinc-500 font-medium">Saved Projects</span>
                <span className="text-base font-bold text-white font-mono">
                  {stats ? stats.projectCount : 0}
                </span>
              </div>
              <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-2.5">
                <span className="block text-[11px] text-zinc-500 font-medium">Total Items</span>
                <span className="text-base font-bold text-white font-mono">
                  {stats ? stats.itemCount : 0}
                </span>
              </div>
              <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-2.5">
                <span className="block text-[11px] text-zinc-500 font-medium">Format</span>
                <span className="text-xs font-semibold text-emerald-400">WebP 180px</span>
              </div>
              <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-2.5">
                <span className="block text-[11px] text-zinc-500 font-medium">Avg Tile Size</span>
                <span className="text-xs font-semibold text-cyan-400">~15 KB</span>
              </div>
            </div>
          </div>

          {/* Section 2: Progressive Web App (PWA) Offline Status */}
          <div className="bg-gradient-to-r from-zinc-900/90 to-zinc-900/50 border border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                {typeof window !== "undefined" && window.innerWidth < 640 ? (
                  <Smartphone className="w-5 h-5" />
                ) : (
                  <Laptop className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Install Progressive Web App</span>
                  {isInstalled && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      Installed
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-400">
                  Enjoy fullscreen standalone mode, offline ranking, and instant load speeds.
                </p>
              </div>
            </div>

            {isInstalled ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
                <span>PWA Active</span>
              </div>
            ) : isInstallable ? (
              <button
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isInstalling ? "Opening Prompt..." : "Install App"}</span>
              </button>
            ) : (
              <div className="text-[11px] text-zinc-500 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
                Use browser menu to Add to Home Screen
              </div>
            )}
          </div>

          {/* Section 3: Data Portability (Export & Restore) */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-zinc-200 mb-1 flex items-center gap-2">
              <FileJson className="w-4 h-4 text-amber-400" />
              <span>Full Data Portability</span>
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Your tier lists are completely yours. Export your full library to a single JSON file
              or migrate between computers and browsers anytime.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleExportBackup}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-semibold text-zinc-200 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Export Backup (.json)</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-semibold text-zinc-200 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Restore Backup (.json)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>
          </div>

          {/* Section 4: Privacy Architecture Guarantees */}
          <div className="space-y-2 text-xs">
            <h4 className="font-semibold text-zinc-400 uppercase tracking-wider text-[11px]">
              Privacy & Security Architecture
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-400">
              <div className="bg-zinc-900/30 border border-zinc-800/60 p-2.5 rounded-lg flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-zinc-200 block text-[11px]">Zero Cloud Uploads</strong>
                  <span>Your draft images stay 100% in local memory until you publish.</span>
                </div>
              </div>
              <div className="bg-zinc-900/30 border border-zinc-800/60 p-2.5 rounded-lg flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-zinc-200 block text-[11px]">Client Canvas WebP</strong>
                  <span>Auto-resizes multi-megabyte photos to 15KB WebP in your browser.</span>
                </div>
              </div>
              <div className="bg-zinc-900/30 border border-zinc-800/60 p-2.5 rounded-lg flex items-start gap-2.5">
                <HardDrive className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-zinc-200 block text-[11px]">Sandboxed IndexedDB</strong>
                  <span>All tiers, color themes, and custom rows persist offline.</span>
                </div>
              </div>
              <div className="bg-zinc-900/30 border border-zinc-800/60 p-2.5 rounded-lg flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-zinc-200 block text-[11px]">No Tracking Scripts</strong>
                  <span>Zero creepy surveillance tags, third-party cookies, or sell-offs.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone: Clear Local Storage */}
          <div className="border-t border-zinc-850 pt-4">
            {!showConfirmClear ? (
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-300">Reset Local Storage</h4>
                  <p className="text-[11px] text-zinc-500">
                    Purge all local tier lists, thumbnails, and cache from this browser.
                  </p>
                </div>
                <button
                  onClick={() => setShowConfirmClear(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer"
                >
                  Clear Data
                </button>
              </div>
            ) : (
              <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3.5 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-semibold text-rose-300">
                      Are you sure you want to delete all local projects?
                    </p>
                    <p className="text-rose-400/80 text-[11px] mt-0.5">
                      This will permanently wipe all drafts, custom items, and settings stored on this device.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowConfirmClear(false)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearAll}
                    disabled={isClearing}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isClearing ? "Purging..." : "Yes, Wipe Device Data"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-zinc-900/60 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span>Tier List Maker v1.0 • Privacy Guaranteed</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
