"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useLanguage, Locale } from "@/lib/i18n";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  Landmark,
  LogOut,
  Sprout,
  Volume2,
  Square,
  X,
  User,
  MapPin,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { PwaInstallPrompt, PwaInstallDrawerAction } from "@/components/PwaInstallPrompt";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { ClientPortal } from "@/components/ClientPortal";

type LoggedInSession =
  | { role: "farmer"; name: string; id: string }
  | { role: "operator"; name: string; id: string; centerId?: string }
  | { role: "admin"; name: string }
  | null;

interface StoredFarmerProfile {
  id?: string;
  fullName?: string;
  maskedAadhaar?: string;
  district?: string;
  state?: string;
  village?: string;
}

export default function GlobalHeader() {
  const { locale, setLocale, t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();

  const [session, setSession] = useState<LoggedInSession>(null);
  const [farmerDetails, setFarmerDetails] = useState<StoredFarmerProfile | null>(null);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [spokenSegments, setSpokenSegments] = useState<string[]>([]);
  const [activeSpeechIndex, setActiveSpeechIndex] = useState(-1);

  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Auto-close language dropdown on click outside anywhere on the screen
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        langDropdownRef.current &&
        !langDropdownRef.current.contains(event.target as Node)
      ) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Synchronize active authentication state
  const refreshSession = () => {
    try {
      const isOperatorRoute = pathname?.startsWith("/operator");
      const isAdminRoute = pathname?.startsWith("/admin");
      const isFarmerRoute = pathname?.startsWith("/farmer");

      const storedFarmer = localStorage.getItem("kisanjod_farmer");
      const storedOperator = localStorage.getItem("kisanjod_operator");
      const storedAdmin =
        sessionStorage.getItem("kisanjod_admin") === "true" ||
        localStorage.getItem("kisanjod_admin") === "true";

      if (storedFarmer) {
        try {
          setFarmerDetails(JSON.parse(storedFarmer));
        } catch {
          setFarmerDetails(null);
        }
      } else {
        setFarmerDetails(null);
      }

      // Prioritize role-specific routes
      if (isOperatorRoute && storedOperator) {
        const parsed = JSON.parse(storedOperator);
        setSession({
          role: "operator",
          name: parsed.fullName || parsed.employeeId || "Operator",
          id: parsed.id,
          centerId: parsed.centerId,
        });
        return;
      }
      if (isAdminRoute && storedAdmin) {
        setSession({ role: "admin", name: "DoCA Admin" });
        return;
      }
      if (isFarmerRoute && storedFarmer) {
        const parsed = JSON.parse(storedFarmer);
        setSession({ role: "farmer", name: parsed.fullName || "Farmer", id: parsed.id });
        return;
      }

      // Fallback resolution
      if (storedFarmer) {
        const parsed = JSON.parse(storedFarmer);
        setSession({ role: "farmer", name: parsed.fullName || "Farmer", id: parsed.id });
        return;
      }
      if (storedOperator) {
        const parsed = JSON.parse(storedOperator);
        setSession({
          role: "operator",
          name: parsed.fullName || parsed.employeeId || "Operator",
          id: parsed.id,
          centerId: parsed.centerId,
        });
        return;
      }
      if (storedAdmin) {
        setSession({ role: "admin", name: "DoCA Admin" });
        return;
      }
      setSession(null);
    } catch {
      setSession(null);
    }
  };

  useEffect(() => {
    refreshSession();

    const handleAuthChange = () => refreshSession();
    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("kisanjod_auth_change", handleAuthChange);

    return () => {
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("kisanjod_auth_change", handleAuthChange);
    };
  }, [pathname]);

  const handleLogout = () => {
    try {
      localStorage.removeItem("kisanjod_farmer");
      localStorage.removeItem("kisanjod_operator");
      localStorage.removeItem("kisanjod_admin");
      sessionStorage.removeItem("kisanjod_admin");
    } catch {}
    setSession(null);
    setFarmerDetails(null);
    window.dispatchEvent(new Event("kisanjod_auth_change"));
    router.push("/login");
  };

  // Global speech readout function
  const toggleSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert(t("unsupportedSpeech"));
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpokenSegments([]);
      setActiveSpeechIndex(-1);
      return;
    }

    const mainEl = document.querySelector("main") || document.body;
    if (!mainEl) return;

    const clone = mainEl.cloneNode(true) as HTMLElement;
    const toRemove = clone.querySelectorAll(
      "nav, header, button, script, style, .icon, [aria-hidden='true']"
    );
    toRemove.forEach((el) => el.remove());

    const textToRead = clone.innerText
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1500);

    if (!textToRead) return;

    window.speechSynthesis.cancel();
    const segments = textToRead.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()) || [textToRead];
    const utterance = new SpeechSynthesisUtterance(segments.join(" "));
    utterance.lang = locale === "hi" ? "hi-IN" : locale === "te" ? "te-IN" : "en-IN";
    utterance.rate = 0.92;

    utterance.onboundary = (event) => {
      let offset = 0;
      const index = segments.findIndex((segment) => {
        const start = offset;
        offset += segment.length + 1;
        return event.charIndex >= start && event.charIndex < offset;
      });
      if (index >= 0) setActiveSpeechIndex(index);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setActiveSpeechIndex(-1);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpokenSegments([]);
      setActiveSpeechIndex(-1);
    };

    window.speechSynthesis.speak(utterance);
    setSpokenSegments(segments);
    setActiveSpeechIndex(0);
    setIsSpeaking(true);
  };

  // Language options
  const languages: { code: Locale; label: string }[] = [
    { code: "en", label: "English" },
    { code: "hi", label: "हिन्दी" },
    { code: "te", label: "తెలుగు" },
  ];

  const currentLangLabel =
    languages.find((l) => l.code === locale)?.label || "English";

  return (
    <header className="sticky top-0 z-50 border-b border-[#dbe6df] bg-[#fffdf8]/95 text-[#17382d] shadow-[0_4px_18px_rgba(14,54,37,0.06)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3.5 py-2.5 sm:px-6 sm:py-3 lg:px-8">
        
        {/* ========================================================================= */}
        {/* TOP-LEFT: TEXT-ONLY LANGUAGE PREFERENCE & SPEAKER (READ ALOUD) BUTTON      */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Text-Only Language Dropdown (No icon, auto-closes on outside click) */}
          <div className="relative" ref={langDropdownRef}>
            <button
              type="button"
              onClick={() => setLangMenuOpen((prev) => !prev)}
              className="flex items-center gap-1 rounded-full border border-[#cfded5] bg-white px-3 py-1.5 text-xs font-black text-[#17382d] shadow-2xs transition-all hover:bg-[#edf5ef] hover:border-emerald-300 active:scale-95"
              aria-expanded={langMenuOpen}
              aria-haspopup="true"
              aria-label="Select Language Preference"
            >
              <span>{currentLangLabel}</span>
              <ChevronDown
                size={14}
                className={`text-emerald-800 transition-transform duration-200 ${
                  langMenuOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>

            {langMenuOpen && (
              <div className="absolute left-0 mt-2 w-36 rounded-2xl bg-white shadow-xl border border-emerald-100 py-1.5 text-gray-800 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  Language / भाषा
                </div>
                {languages.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => {
                      setLocale(l.code);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left text-xs font-bold flex items-center justify-between transition-colors hover:bg-emerald-50 ${
                      locale === l.code
                        ? "text-emerald-900 bg-emerald-50/80 font-black"
                        : "text-gray-700"
                    }`}
                  >
                    <span>{l.label}</span>
                    {locale === l.code && <span className="text-emerald-700 font-extrabold">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Single Audio / Speaker Button (Read Aloud) */}
          <button
            type="button"
            onClick={toggleSpeech}
            className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border text-xs sm:text-sm font-bold transition-all active:scale-95 ${
              isSpeaking
                ? "border-[#c28b2c] bg-[#f2c56f] text-[#51370f] animate-pulse shadow-sm"
                : "border-[#cfded5] bg-white text-[#176b4b] shadow-2xs hover:bg-[#edf5ef]"
            }`}
            title={isSpeaking ? t("stopListening") : t("listenPage")}
            aria-label={isSpeaking ? t("stopListening") : t("listenPage")}
          >
            {isSpeaking ? (
              <Square size={14} fill="currentColor" aria-hidden="true" />
            ) : (
              <Volume2 size={16} aria-hidden="true" />
            )}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TOP-RIGHT: AUTHENTICATED PROFILE TRIGGER OR PUBLIC ROLE PORTALS            */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2">
          {session ? (
            /* Logged-in profile trigger: 2-line title (Name on top, KisanJod below) on LEFT, Profile Avatar on RIGHT */
            <button
              type="button"
              onClick={() => setProfileDrawerOpen(true)}
              className="group flex items-center gap-2 sm:gap-2.5 rounded-2xl border border-emerald-200/80 bg-white/90 p-1 sm:p-1.5 pl-2.5 sm:pl-3 pr-1 sm:pr-1.5 shadow-2xs transition-all hover:bg-emerald-50/70 hover:border-emerald-300 hover:shadow-sm active:scale-[0.98] text-right"
              aria-label="Open Farmer Profile and Menu"
            >
              {/* 2-line Label: Name on top, Role or Platform below */}
              <div className="flex flex-col min-w-0 items-end text-right">
                <span className="text-xs sm:text-sm font-black text-[#17382d] leading-tight truncate max-w-[110px] sm:max-w-[170px]">
                  {session.role === "admin" ? "DoCA Admin" : session.name}
                </span>
                <span className="text-[10px] sm:text-[11px] font-extrabold text-emerald-700 leading-tight tracking-wide">
                  {session.role === "operator"
                    ? "Mandi Operator"
                    : session.role === "admin"
                    ? "Oversight Portal"
                    : "KisanJod"}
                </span>
              </div>

              {/* Profile Avatar on the far right corner */}
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-[#176b4b] text-white shadow-xs transition-transform group-hover:scale-105 overflow-hidden border border-emerald-300">
                {session.role === "farmer" ? (
                  <img
                    src="/icons/farmer-avatar.svg"
                    alt="Farmer Profile"
                    className="h-full w-full object-cover"
                  />
                ) : session.role === "operator" ? (
                  <Building2 size={18} className="text-emerald-100" aria-hidden="true" />
                ) : (
                  <Landmark size={18} className="text-emerald-100" aria-hidden="true" />
                )}
              </div>
            </button>
          ) : (
            /* When not logged in: Brand badge only */
            <Link href="/" className="flex items-center gap-2 font-heading font-black text-sm text-[#17382d] hover:opacity-90 transition-opacity">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f7ead0] border border-[#d8b56a] text-[#8a5a16]">
                <Sprout size={16} />
              </div>
              <span>KisanJod</span>
            </Link>
          )}
        </div>
      </div>

      {/* Floating Speech Reader progress bar if speaking */}
      {isSpeaking && spokenSegments.length > 0 && (
        <div className="speech-reader-panel" role="status" aria-live="polite">
          <Volume2 size={16} aria-hidden="true" />
          <p>
            {spokenSegments.map((segment, index) => (
              <span key={`${segment}-${index}`} className={index === activeSpeechIndex ? "speech-segment-active" : ""}>
                {segment}{" "}
              </span>
            ))}
          </p>
        </div>
      )}

      {/* Background Toast for PWA installation (no header button clutter) */}
      <PwaInstallPrompt showHeaderButton={false} />

      {/* ========================================================================= */}
      {/* SLIDE-OVER PROFILE DRAWER (Opens on clicking farmer profile trigger)       */}
      {/* ========================================================================= */}
      {profileDrawerOpen && (
        <ClientPortal>
          <div className="fixed inset-0 z-[99990] flex justify-end">
            {/* Backdrop overlay */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
              onClick={() => setProfileDrawerOpen(false)}
              aria-hidden="true"
            />

            {/* Slide-over Drawer Panel */}
            <aside
              className="relative z-10 w-full max-w-sm sm:max-w-md bg-white h-full shadow-2xl flex flex-col justify-between p-5 sm:p-6 transition-transform duration-300 ease-out animate-in slide-in-from-right overflow-y-auto"
              role="dialog"
              aria-modal="true"
              aria-label="Farmer Profile Drawer"
            >
              {/* Top Content */}
              <div className="space-y-5">
                {/* Drawer Header with Close Button */}
                <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf5ef] border border-emerald-200 text-emerald-800 shadow-2xs overflow-hidden">
                      {session?.role === "farmer" ? (
                        <img
                          src="/icons/farmer-avatar.svg"
                          alt="Farmer Profile"
                          className="h-full w-full object-cover"
                        />
                      ) : session?.role === "operator" ? (
                        <Building2 size={22} className="text-[#176b4b]" />
                      ) : (
                        <Landmark size={22} className="text-[#176b4b]" />
                      )}
                    </div>
                  <div>
                    <h2 className="text-base font-black text-gray-900 leading-tight flex items-center gap-2">
                      <span>{session?.name}</span>
                      {session?.role === "farmer" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                          <ShieldCheck size={11} />
                          Verified
                        </span>
                      )}
                    </h2>
                    {session?.role === "operator" ? (
                      <p className="text-[11px] font-extrabold text-blue-700 uppercase tracking-wider mt-0.5">
                        APMC Mandi Operator
                      </p>
                    ) : session?.role === "admin" ? (
                      <p className="text-[11px] font-extrabold text-purple-700 uppercase tracking-wider mt-0.5">
                        DoCA Platform Admin
                      </p>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setProfileDrawerOpen(false)}
                  className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  aria-label="Close Profile Drawer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Farmer Personal Profile Card */}
              {session?.role === "farmer" && (
                <div className="rounded-2xl border border-emerald-100 bg-[#f8faf9] p-4 space-y-2.5 text-xs">
                  {farmerDetails?.maskedAadhaar && (
                    <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                      <span className="text-gray-500 font-semibold flex items-center gap-1.5">
                        <CreditCard size={13} className="text-gray-400" />
                        Aadhaar UID
                      </span>
                      <span className="font-mono font-black text-gray-900 tracking-wider">
                        {farmerDetails.maskedAadhaar}
                      </span>
                    </div>
                  )}

                  {(farmerDetails?.village || farmerDetails?.district || farmerDetails?.state) && (
                    <div className="flex items-start justify-between py-1 border-b border-gray-200/60">
                      <span className="text-gray-500 font-semibold flex items-center gap-1.5 pt-0.5">
                        <MapPin size={13} className="text-gray-400 shrink-0" />
                        Location
                      </span>
                      <span className="font-bold text-gray-800 text-right max-w-[180px]">
                        {[farmerDetails.village, farmerDetails.district, farmerDetails.state]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-gray-500 font-semibold">Khasra Status</span>
                    <span className="font-extrabold text-emerald-800">
                      Land Records Linked
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Link to Farmer Dashboard / Home */}
              {session?.role === "farmer" && (
                <div className="grid grid-cols-2 gap-2 text-xs font-extrabold">
                  <Link
                    href="/farmer/dashboard"
                    onClick={() => setProfileDrawerOpen(false)}
                    className="flex items-center justify-center gap-1.5 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 transition-colors shadow-2xs"
                  >
                    🏠 Dashboard
                  </Link>
                  <Link
                    href="/farmer/book"
                    onClick={() => setProfileDrawerOpen(false)}
                    className="flex items-center justify-center gap-1.5 p-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 transition-colors shadow-2xs"
                  >
                    🌾 Book Slot
                  </Link>
                </div>
              )}

              {/* Operator Profile Card & Action */}
              {session?.role === "operator" && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                      APMC Gate Operator
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800">
                      <ShieldCheck size={12} />
                      Duty Active
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-blue-200/60">
                      <span className="text-gray-500 font-semibold">Operator</span>
                      <strong className="text-gray-900 font-bold">{session.name}</strong>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-blue-200/60">
                      <span className="text-gray-500 font-semibold">Center ID</span>
                      <span className="font-mono font-bold text-gray-800">{session.centerId || "center_gnt_01"}</span>
                    </div>
                  </div>
                  <Link
                    href="/operator"
                    onClick={() => setProfileDrawerOpen(false)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs transition-colors"
                  >
                    <span>⚖️ Open Weighing Bay Console</span>
                  </Link>
                </div>
              )}

              {/* Admin Profile Card & Action */}
              {session?.role === "admin" && (
                <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-700">
                      DoCA Administration
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-extrabold text-purple-800">
                      <ShieldCheck size={12} />
                      National Access
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-purple-200/60">
                      <span className="text-gray-500 font-semibold">Department</span>
                      <strong className="text-gray-900 font-bold">Dept of Consumer Affairs</strong>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-purple-200/60">
                      <span className="text-gray-500 font-semibold">Scope</span>
                      <span className="font-bold text-gray-800">All India APMC Network</span>
                    </div>
                  </div>
                  <Link
                    href="/admin"
                    onClick={() => setProfileDrawerOpen(false)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-xs transition-colors"
                  >
                    <span>📊 Open National Analytics</span>
                  </Link>
                </div>
              )}

              {/* PWA App Install Action inside Drawer */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Mobile App
                </span>
                <PwaInstallDrawerAction />
              </div>
            </div>

            {/* Bottom Actions: Log Out Button with Confirmation */}
            <div className="pt-6 border-t border-gray-100 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setProfileDrawerOpen(false);
                  setShowLogoutConfirm(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 font-black text-sm border border-red-200/80 transition-all shadow-2xs"
              >
                <LogOut size={16} aria-hidden="true" />
                <span>{t("logout")}</span>
              </button>
            </div>
          </aside>
        </div>
      </ClientPortal>
      )}

      {/* Confirmation Modal for Profile Logout */}
      <ConfirmationModal
        isOpen={showLogoutConfirm}
        title="Confirm Logout"
        description={`Are you sure you want to log out of your session, ${session?.name || "User"}?`}
        consequence="You will need to verify your credentials again to access your slot details and mandi bookings."
        confirmText="Yes, Log Out"
        cancelText="Stay Logged In"
        variant="warning"
        voiceText={`Are you sure you want to log out, ${session?.name || "User"}?`}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          handleLogout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </header>
  );
}
