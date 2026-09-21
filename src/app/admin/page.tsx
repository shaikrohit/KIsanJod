"use client";

import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/lib/i18n";
import { to12Hour } from "@/lib/timeFormat";
import { Eye, EyeOff } from "lucide-react";
import { useInstantSync } from "@/lib/useInstantSync";

interface Stats {
  overview: {
    totalBookings: number;
    todayBookings: number;
    completedBookings: number;
    waitingBookings: number;
    totalProcuredQtl: number;
    totalAmountInr: number;
    billsGenerated: number;
  };
  payments: Array<{ status: string; count: number; totalAmount: number }>;
  centreStats: Array<{
    name: string;
    district: string;
    totalBookings: number;
    todayTotal: number;
    todayWaiting: number;
    todayCompleted: number;
    maxDailySlots: number;
    utilization: number;
  }>;
}

interface CentreConfig {
  id: string;
  name: string;
  district: string;
  state: string;
  activeWorkers?: number;
  morningSessionStart?: string;
  morningSessionEnd?: string;
  afternoonSessionStart?: string;
  afternoonSessionEnd?: string;
}

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [loggedIn, setLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState("admin");
  const [adminPass, setAdminPass] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  // Mandi Operating Sessions Configuration
  const [centres, setCentres] = useState<CentreConfig[]>([]);
  const [selectedCentreId, setSelectedCentreId] = useState("");
  const [activeWorkers, setActiveWorkers] = useState<number>(4);
  const [mornStart, setMornStart] = useState("09:00");
  const [mornEnd, setMornEnd] = useState("13:00");
  const [aftStart, setAftStart] = useState("15:00");
  const [aftEnd, setAftEnd] = useState("17:00");
  const [savingCentre, setSavingCentre] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [adminError, setAdminError] = useState("");

  useEffect(() => {
    try {
      if (sessionStorage.getItem("kisanjod_admin") === "true") {
        setLoggedIn(true);
      }
    } catch {}
  }, []);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (adminUser === "admin" && adminPass === "admin123") {
      setAdminError("");
      localStorage.removeItem("kisanjod_farmer");
      localStorage.removeItem("kisanjod_operator");
      sessionStorage.setItem("kisanjod_admin", "true");
      localStorage.setItem("kisanjod_admin", "true");
      window.dispatchEvent(new Event("kisanjod_auth_change"));
      setLoggedIn(true);
    } else {
      setAdminError(t("invalidAdmin") || "Invalid admin credentials");
    }
  };

  const fetchCentres = useCallback(() => {
    fetch("/api/centres")
      .then((r) => r.json())
      .then((d) => {
        if (d.centres && d.centres.length > 0) {
          setCentres(d.centres);
          if (!selectedCentreId) {
            setSelectedCentreId(d.centres[0].id);
            setActiveWorkers(d.centres[0].activeWorkers || 4);
            setMornStart(d.centres[0].morningSessionStart || "09:00");
            setMornEnd(d.centres[0].morningSessionEnd || "13:00");
            setAftStart(d.centres[0].afternoonSessionStart || "15:00");
            setAftEnd(d.centres[0].afternoonSessionEnd || "17:00");
          }
        }
      })
      .catch(console.error);
  }, [selectedCentreId]);

  const handleCentreChange = (centreId: string) => {
    setSelectedCentreId(centreId);
    const target = centres.find((c) => c.id === centreId);
    if (target) {
      setActiveWorkers(target.activeWorkers || 4);
      setMornStart(target.morningSessionStart || "09:00");
      setMornEnd(target.morningSessionEnd || "13:00");
      setAftStart(target.afternoonSessionStart || "15:00");
      setAftEnd(target.afternoonSessionEnd || "17:00");
    }
  };

  const handleSaveCentreTimings = async () => {
    if (!selectedCentreId) return;
    setSavingCentre(true);
    try {
      const res = await fetch("/api/centres", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centerId: selectedCentreId,
          activeWorkers: Number(activeWorkers),
          morningSessionStart: mornStart,
          morningSessionEnd: mornEnd,
          afternoonSessionStart: aftStart,
          afternoonSessionEnd: aftEnd,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccessMsg("Mandi session settings updated successfully!");
        setTimeout(() => setSaveSuccessMsg(""), 3500);
        // Update local list
        setCentres((prev) =>
          prev.map((c) =>
            c.id === selectedCentreId
              ? {
                  ...c,
                  activeWorkers: Number(activeWorkers),
                  morningSessionStart: mornStart,
                  morningSessionEnd: mornEnd,
                  afternoonSessionStart: aftStart,
                  afternoonSessionEnd: aftEnd,
                }
              : c
          )
        );
      }
    } catch {
      setSaveSuccessMsg("Failed to update centre timings");
      setTimeout(() => setSaveSuccessMsg(""), 3500);
    }
    setSavingCentre(false);
  };

  const fetchStats = useCallback(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        setStats(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Zero-delay instant telemetry sync over SSE
  useInstantSync(() => {
    if (loggedIn) {
      fetchStats();
      fetchCentres();
    }
  });

  useEffect(() => {
    if (!loggedIn) return;
    setLoading(true);
    fetchCentres();
    fetchStats();
  }, [loggedIn, fetchCentres, fetchStats]);

  if (!loggedIn) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md glass-card p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-3">
              <span className="text-3xl">🏛️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 font-heading">
              {t("adminLogin")}
            </h2>
            <p className="text-xs text-gray-500 mt-1">{t("adminSubtitle")}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              value={adminUser}
              onChange={(e) => setAdminUser(e.target.value)}
              placeholder={t("username")}
              className="w-full px-4 py-3.5 text-base font-semibold border-2 border-purple-200 rounded-2xl focus:border-purple-600 focus:outline-none"
              required
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                placeholder={t("password")}
                className="w-full px-4 py-3.5 pr-12 text-base font-semibold border-2 border-purple-200 rounded-2xl focus:border-purple-600 focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-purple-700 transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-purple-700 bg-purple-50 p-2 rounded-xl text-center font-medium border border-purple-200">
              💡 Demo: admin / admin123
            </p>
            {adminError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-bold text-center">
                {adminError}
              </div>
            )}
            <button
              type="submit"
              className="btn-touch w-full bg-purple-700 hover:bg-purple-800 text-white shadow-lg"
            >
              {t("login")} →
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <div className="text-center py-16 text-white">
        <div className="w-10 h-10 border-4 border-purple-300 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="font-semibold text-sm">{t("loadingAdmin")}</p>
      </div>
    );
  }

  const { overview, centreStats, payments } = stats;
  const creditedPayment = payments.find((p) => p.status === "CREDITED");
  const processingPayment = payments.find((p) => p.status === "PROCESSING");

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-12">
      {/* Executive Telemetry Header (No external logout button) */}
      <div className="glass-card p-4 flex items-center justify-between border-l-4 border-purple-600">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60">
            DoCA National Dashboard
          </span>
          <h2 className="text-lg font-bold text-gray-900 font-heading mt-1">
            Department of Consumer Affairs Telemetry
          </h2>
          <p className="text-xs text-gray-500">
            Real-time buffer stocking & MSP procurement analytics
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card p-4 border-l-4 border-emerald-600">
          <p className="text-xs text-gray-500 font-bold uppercase">Procurement</p>
          <p className="text-xl font-black text-emerald-950 font-heading mt-0.5">
            {overview.totalProcuredQtl} Qtl
          </p>
          <p className="text-xs text-emerald-700 font-semibold mt-1">
            ₹{overview.totalAmountInr.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="glass-card p-4 border-l-4 border-blue-600">
          <p className="text-xs text-gray-500 font-bold uppercase">Farmers Served</p>
          <p className="text-xl font-black text-blue-900 font-heading mt-0.5">
            {overview.completedBookings}
          </p>
          <p className="text-xs text-blue-600 font-semibold mt-1">
            {overview.billsGenerated} J-Forms
          </p>
        </div>

        <div className="glass-card p-4 border-l-4 border-amber-500">
          <p className="text-xs text-gray-500 font-bold uppercase">Waiting Now</p>
          <p className="text-xl font-black text-amber-700 font-heading mt-0.5">
            {overview.waitingBookings}
          </p>
          <p className="text-xs text-amber-600 font-semibold mt-1">active queue</p>
        </div>

        <div className="glass-card p-4 border-l-4 border-purple-600">
          <p className="text-xs text-gray-500 font-bold uppercase">Today Bookings</p>
          <p className="text-xl font-black text-purple-900 font-heading mt-0.5">
            {overview.todayBookings}
          </p>
          <p className="text-xs text-purple-600 font-semibold mt-1">total today</p>
        </div>
      </div>

      {/* Payment Clearance Breakdown */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="text-sm font-bold text-gray-800 font-heading border-b border-gray-100 pb-2">
          💰 DBT & PFMS Treasury Disbursement Status
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
            <p className="text-xs text-emerald-800 font-bold uppercase">
              Credited (DBT Settled)
            </p>
            <p className="text-2xl font-black text-emerald-950 font-heading my-1">
              {creditedPayment?.count || 0} Accounts
            </p>
            <p className="text-xs text-emerald-700 font-semibold">
              ₹{(creditedPayment?.totalAmount || 0).toLocaleString("en-IN")}
            </p>
          </div>

          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
            <p className="text-xs text-amber-800 font-bold uppercase">
              Processing (PFMS Queue)
            </p>
            <p className="text-2xl font-black text-amber-950 font-heading my-1">
              {processingPayment?.count || 0} Accounts
            </p>
            <p className="text-xs text-amber-700 font-semibold">
              ₹{(processingPayment?.totalAmount || 0).toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Mandi Operating Sessions Configuration Card */}
      <div className="glass-card p-5 space-y-4 border-l-4 border-indigo-600">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 font-heading flex items-center gap-1.5">
              <span>⏱️</span> Mandi Operating Sessions & Lunch Break Settings
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Configure daily Morning and Afternoon operating hours per APMC procurement centre
            </p>
          </div>

          {centres.length > 0 && (
            <select
              value={selectedCentreId}
              onChange={(e) => handleCentreChange(e.target.value)}
              className="text-xs font-bold p-2 bg-white border border-gray-300 rounded-xl shadow-xs"
            >
              {centres.map((c) => (
                <option key={c.id} value={c.id}>
                  🏢 {c.name} ({c.district})
                </option>
              ))}
            </select>
          )}
        </div>

        {saveSuccessMsg && (
          <p className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-bold">
            ✓ {saveSuccessMsg}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Morning Session Box */}
          <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-3">
            <span className="font-extrabold text-blue-950 flex items-center gap-1.5">
              <span>🌅</span> Morning Session ({to12Hour(mornStart)} – {to12Hour(mornEnd)})
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-gray-600 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={mornStart}
                  onChange={(e) => setMornStart(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-gray-600 mb-1">
                  End Time (Lunch Starts)
                </label>
                <input
                  type="time"
                  value={mornEnd}
                  onChange={(e) => setMornEnd(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold"
                />
              </div>
            </div>
          </div>

          {/* Afternoon Session Box */}
          <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
            <span className="font-extrabold text-amber-950 flex items-center gap-1.5">
              <span>☀️</span> Afternoon Session ({to12Hour(aftStart)} – {to12Hour(aftEnd)})
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-gray-600 mb-1">
                  Start Time (Lunch Ends)
                </label>
                <input
                  type="time"
                  value={aftStart}
                  onChange={(e) => setAftStart(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-gray-600 mb-1">
                  Closing Time
                </label>
                <input
                  type="time"
                  value={aftEnd}
                  onChange={(e) => setAftEnd(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Active Palledar Gang Labor Size */}
        <div className="p-3.5 bg-purple-50/80 rounded-2xl border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-extrabold text-purple-950 flex items-center gap-1.5">
              <span>👥</span> Active Palledar Gang Labor Size
            </span>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Standard 4-worker gang (~3 min/bag baseline, dynamically scales arrival windows)
            </p>
          </div>
          <div className="flex gap-1.5">
            {[2, 4, 6, 8].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setActiveWorkers(w)}
                className={`px-3.5 py-2 rounded-xl font-black text-xs border transition-all ${
                  activeWorkers === w
                    ? "bg-purple-700 text-white border-purple-800 shadow-sm"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
              >
                {w} {w === 4 ? "(Std 4)" : "Workers"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-gray-100">
          <span className="text-xs text-gray-600 font-semibold">
            🍽️ Mandi Lunch & Worker Shift Break: <strong>{to12Hour(mornEnd)} – {to12Hour(aftStart)}</strong>
          </span>
          <button
            type="button"
            onClick={handleSaveCentreTimings}
            disabled={savingCentre}
            className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-black text-xs rounded-xl shadow-md disabled:opacity-50 transition-colors"
          >
            {savingCentre ? "Saving..." : "Save Centre Session Hours"}
          </button>
        </div>
      </div>

      {/* Centre Capacity Utilization */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-800 font-heading border-b border-gray-100 pb-2">
          🏢 Mandi Centre Capacity & Hourly Bay Load
          🏢 Mandi Centre Capacity & Hourly Mandi Throughput
        </h3>
        <div className="space-y-4">
          {centreStats.map((c, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-900">{c.name}</span>
                <span className="text-gray-600">
                  {c.todayTotal}/{c.maxDailySlots} ({c.utilization}% load)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-600 h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(c.utilization, 100)}%` }}
                />
              </div>
              <div className="flex gap-3 text-[11px] text-gray-500 font-medium">
                <span>✅ {c.todayCompleted} completed</span>
                <span>⏳ {c.todayWaiting} waiting</span>
                <span>📍 {c.district}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
