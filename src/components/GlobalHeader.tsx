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
  X,
  User,
  MapPin,
  ShieldCheck,
  CreditCard,
  FileText,
  Layers,
  TrendingUp,
  CheckCircle2,
  Check,
} from "lucide-react";
import { PwaInstallPrompt, PwaInstallDrawerAction } from "@/components/PwaInstallPrompt";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { ClientPortal } from "@/components/ClientPortal";
import { NotificationBell } from "@/components/NotificationBell";

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
  phoneNumber?: string;
  landRecords?: Array<{
    khasraNumber: string;
    khatauniNumber: string;
    subDistrictTehsil?: string;
    totalLandAreaAcres?: number;
    verifiedSownCrop?: string;
    sownAreaAcres?: number;
    mspProductivityNormQtlPerAcre?: number;
    maxProcurementQuotaQtl?: number;
    utilizedQuotaQtl?: number;
    remainingQuotaQtl?: number;
  }>;
  bankAccount?: {
    bankName: string;
    accountMasked: string;
    ifsc: string;
    pfmsBeneficiaryCode?: string;
    isAadhaarLinked?: boolean;
  };
}

export default function GlobalHeader() {
  const { locale, setLocale, t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();

  const [session, setSession] = useState<LoggedInSession>(null);
  const [farmerDetails, setFarmerDetails] = useState<StoredFarmerProfile | null>(null);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

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
        {/* TOP-LEFT: TEXT-ONLY LANGUAGE PREFERENCE */}
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

          {/* Native PWA Notification Bell — only for authenticated users */}
          {session && <NotificationBell userRole={session.role} />}
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
                    ? "Procurement Operator"
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
              <div className="space-y-4">
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
                        Procurement Operator
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

              {/* Government-Style Bhulekh / PM-Kisan Land Revenue Dossier */}
              {session?.role === "farmer" && (() => {
                const primaryLand = farmerDetails?.landRecords?.[0];
                const totalArea = primaryLand?.totalLandAreaAcres || primaryLand?.sownAreaAcres || 4.5;
                const totalHectares = (totalArea * 0.404686).toFixed(2);
                const isMarginal = totalArea < 2.5;
                const isSmall = totalArea >= 2.5 && totalArea <= 5.0;
                const classificationLabel = isMarginal
                  ? "Marginal Farmer (सीमांत किसान)"
                  : isSmall
                  ? "Small Farmer (लघु किसान)"
                  : "Medium Farmer (मध्यम किसान)";
                const classificationColor = isMarginal
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : isSmall
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                  : "bg-blue-100 text-blue-900 border-blue-300";

                const maxQuota = primaryLand?.maxProcurementQuotaQtl || 98.0;
                const utilizedQuota = primaryLand?.utilizedQuotaQtl || 0.0;
                const remainingQuota = primaryLand?.remainingQuotaQtl ?? Math.max(0, maxQuota - utilizedQuota);
                const quotaPercent = Math.min(100, Math.round((utilizedQuota / (maxQuota || 1)) * 100));

                const bank = farmerDetails?.bankAccount;

                return (
                  <div className="space-y-3 text-xs">
                    {/* Official Category Pill & Aadhaar Strip */}
                    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 to-[#f4faf6] p-3.5 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${classificationColor}`}>
                          <ShieldCheck size={11} />
                          {classificationLabel}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-gray-500">
                          Bhulekh ID: BHL-{farmerDetails?.id?.slice(-5).toUpperCase() || "78491"}
                        </span>
                      </div>

                      {farmerDetails?.maskedAadhaar && (
                        <div className="flex items-center justify-between pt-1 border-t border-emerald-200/50">
                          <span className="text-gray-500 font-semibold flex items-center gap-1.5">
                            <CreditCard size={13} className="text-emerald-700" />
                            Aadhaar UID
                          </span>
                          <span className="font-mono font-black text-gray-900 tracking-wider">
                            {farmerDetails.maskedAadhaar}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bhulekh Land Parcel Holdings Dossier Card */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-3.5 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                        <span className="text-[11px] font-black text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
                          <Layers size={13} className="text-emerald-700" />
                          Land Parcel Record (भू-अभिलेख)
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 size={10} /> RoR Verified
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                          <span className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">Khasra / Survey</span>
                          <strong className="text-gray-900 font-black">{primaryLand?.khasraNumber || "204/3"}</strong>
                        </div>
                        <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                          <span className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">Khatauni / Patta</span>
                          <strong className="text-gray-900 font-black">{primaryLand?.khatauniNumber || "KH-00812"}</strong>
                        </div>
                        <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                          <span className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">Total Holdings</span>
                          <strong className="text-emerald-950 font-black">{totalArea} Acres <span className="text-[9px] text-gray-500">({totalHectares} Ha)</span></strong>
                        </div>
                        <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                          <span className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">Tehsil / Sub-Dist</span>
                          <strong className="text-gray-900 font-black truncate block">{primaryLand?.subDistrictTehsil || "Guntur Rural"}</strong>
                        </div>
                      </div>

                      {(farmerDetails?.village || farmerDetails?.district || farmerDetails?.state) && (
                        <div className="flex items-center justify-between text-[11px] pt-1 text-gray-600">
                          <span className="flex items-center gap-1 text-gray-500 font-semibold">
                            <MapPin size={12} className="text-gray-400" /> Revenue Village
                          </span>
                          <strong className="text-gray-800 font-bold">
                            {[farmerDetails.village, farmerDetails.district, farmerDetails.state].filter(Boolean).join(", ")}
                          </strong>
                        </div>
                      )}
                    </div>

                    {/* Crop Sown & Seasonal Mandi Quota Meter */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-3.5 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                        <span className="text-[11px] font-black text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
                          <TrendingUp size={13} className="text-emerald-700" />
                          Verified Crop & Quota Meter
                        </span>
                        <span className="text-[10px] font-extrabold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                          {primaryLand?.verifiedSownCrop || "Paddy"} ({primaryLand?.sownAreaAcres || 3.5} Ac)
                        </span>
                      </div>

                      {/* Quota Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-extrabold text-gray-600">
                          <span>Utilized: {utilizedQuota.toFixed(1)} Qtl</span>
                          <span className="text-emerald-900">Remaining: {remainingQuota.toFixed(1)} Qtl</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 transition-all duration-500"
                            style={{ width: `${quotaPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] font-bold text-gray-400 pt-0.5">
                          <span>0 Qtl</span>
                          <span>Norm: {primaryLand?.mspProductivityNormQtlPerAcre || 28} Qtl/Ac</span>
                          <span>Max: {maxQuota.toFixed(1)} Qtl</span>
                        </div>
                      </div>
                    </div>

                    {/* PFMS & DBT Direct Bank Linkage */}
                    <div className="rounded-2xl border border-emerald-100 bg-[#f8faf9] p-3 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1">
                          <Landmark size={12} className="text-emerald-700" /> DBT Treasury Account
                        </span>
                        <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/70 px-2 py-0.2 rounded-full flex items-center gap-1">
                          <Check size={10} /> APBS Active
                        </span>
                      </div>
                      <div className="flex justify-between items-center font-semibold pt-0.5">
                        <span className="text-gray-800 font-bold">{bank?.bankName || "State Bank of India"}</span>
                        <span className="font-mono text-gray-900 font-black">{bank?.accountMasked || "••••••••8821"}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-500">
                        <span>IFSC: <strong className="font-mono text-gray-700">{bank?.ifsc || "SBIN0004567"}</strong></span>
                        <span>PFMS Beneficiary ID: <strong className="font-mono text-gray-700">{bank?.pfmsBeneficiaryCode || "PFMS-BEN-432187"}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
        onConfirm={() => {
          setShowLogoutConfirm(false);
          handleLogout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </header>
  );
}
