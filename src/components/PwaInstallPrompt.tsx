"use client";

import React, { useEffect, useState, useRef } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Module-level prompt capture so drawer and toast share prompt state
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

export function PwaInstallPrompt({ showHeaderButton = false }: { showHeaderButton?: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Check if running in standalone PWA mode or marked installed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      localStorage.getItem("kisanjod_pwa_installed") === "true";

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Check if already dismissed in this session
    const isDismissed = sessionStorage.getItem("kisanjod_pwa_dismissed") === "true";

    // 3. Listen for native browser beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      globalDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      window.dispatchEvent(new Event("kisanjod_pwa_ready"));

      if (!isDismissed) {
        // Trigger standard PWA popup after short delay
        setTimeout(() => {
          triggerToast();
        }, 1500);
      }
    };

    // 4. Listen for appinstalled
    const handleAppInstalled = () => {
      globalDeferredPrompt = null;
      setIsInstalled(true);
      setShowToast(false);
      setDeferredPrompt(null);
      localStorage.setItem("kisanjod_pwa_installed", "true");
      window.dispatchEvent(new Event("kisanjod_pwa_installed"));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  const triggerToast = () => {
    setShowToast(true);
    // Auto-dismiss after 6 seconds like standard mobile PWA prompts
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      setShowToast(false);
    }, 6000);
  };

  const handleDismiss = () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    sessionStorage.setItem("kisanjod_pwa_dismissed", "true");
    setShowToast(false);
  };

  const handleInstall = async () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    const promptToUse = deferredPrompt || globalDeferredPrompt;
    if (promptToUse) {
      await promptToUse.prompt();
      const choice = await promptToUse.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        localStorage.setItem("kisanjod_pwa_installed", "true");
      }
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
      setShowToast(false);
    } else {
      setShowToast(false);
    }
  };

  // If already installed, never show anything (no icon, no prompt)
  if (isInstalled) return null;

  return (
    <>
      {/* Header button only rendered if explicitly requested (default: hidden per mobile UX) */}
      {showHeaderButton && (
        <button
          type="button"
          onClick={() => {
            if (deferredPrompt || globalDeferredPrompt) {
              handleInstall();
            } else {
              triggerToast();
            }
          }}
          title="Install KisanJod App"
          aria-label="Install KisanJod App"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold bg-[#edf5ef] hover:bg-[#d8ebd9] text-[#176b4b] border border-[#cfded5] transition-all active:scale-95 shadow-sm"
        >
          <Download size={14} className="text-[#176b4b]" aria-hidden="true" />
          <span className="hidden sm:inline">Install</span>
        </button>
      )}

      {/* Standard Minimal PWA Toast Banner (Auto-dismisses in 6s) */}
      {showToast && (
        <div
          role="status"
          aria-live="polite"
          onMouseEnter={() => {
            if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
          }}
          onMouseLeave={() => {
            dismissTimerRef.current = setTimeout(() => setShowToast(false), 4000);
          }}
          className="fixed bottom-4 inset-x-4 max-w-sm mx-auto sm:right-6 sm:left-auto z-[9999] flex items-center justify-between gap-3 bg-white/95 backdrop-blur-md border border-emerald-200/90 rounded-2xl p-3 shadow-xl transition-all animate-in slide-in-from-bottom-3 duration-300"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-800 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
              🌾
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate">
                Install KisanJod
              </p>
              <p className="text-[11px] text-gray-500 truncate">
                Fast offline access
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstall}
              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs transition-colors shadow-sm"
            >
              Install
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss installation prompt"
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * PwaInstallDrawerAction: Rich install action inside the profile slide-over drawer
 */
export function PwaInstallDrawerAction() {
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        localStorage.getItem("kisanjod_pwa_installed") === "true";
      setIsInstalled(isStandalone);
    };

    checkStatus();
    window.addEventListener("kisanjod_pwa_installed", checkStatus);
    window.addEventListener("kisanjod_pwa_ready", checkStatus);

    return () => {
      window.removeEventListener("kisanjod_pwa_installed", checkStatus);
      window.removeEventListener("kisanjod_pwa_ready", checkStatus);
    };
  }, []);

  const handleInstallClick = async () => {
    if (globalDeferredPrompt) {
      await globalDeferredPrompt.prompt();
      const choice = await globalDeferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        localStorage.setItem("kisanjod_pwa_installed", "true");
      }
      globalDeferredPrompt = null;
    } else {
      alert("To install KisanJod: tap your browser's menu (⋮ or Share) and select 'Add to Home Screen' or 'Install App'.");
    }
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-2xs">
        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
          ✓
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-emerald-900">App Installed</p>
          <p className="text-[11px] text-emerald-700 truncate">KisanJod offline access ready</p>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleInstallClick}
      className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#edf5ef] hover:bg-[#d8ebd9] border border-[#cfded5] transition-all group shadow-2xs active:scale-[0.99]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform shrink-0">
          <Download size={16} />
        </div>
        <div className="text-left min-w-0">
          <p className="text-xs font-bold text-[#17382d] truncate">Install KisanJod App</p>
          <p className="text-[11px] text-[#5c756a] truncate">Fast 1-tap home screen access</p>
        </div>
      </div>
      <span className="text-xs font-extrabold text-[#176b4b] bg-white px-2.5 py-1 rounded-xl border border-emerald-200 shadow-2xs shrink-0 ml-2">
        Install
      </span>
    </button>
  );
}
