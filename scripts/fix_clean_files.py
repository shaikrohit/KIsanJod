# scripts/fix_clean_files.py
import os

BASE_DIR = r"c:\Users\rohit\OneDrive\Desktop\KisanJod"

# -----------------------------------------------------------------------------
# 1. src/app/admin/page.tsx
# -----------------------------------------------------------------------------
admin_code = '''"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";

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

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [loggedIn, setLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState("admin");
  const [adminPass, setAdminPass] = useState("admin123");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

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
      sessionStorage.setItem("kisanjod_admin", "true");
      setLoggedIn(true);
    } else {
      alert("Invalid credentials. Use admin / admin123");
    }
  };

  useEffect(() => {
    if (!loggedIn) return;
    setLoading(true);
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        setStats(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [loggedIn]);

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
              placeholder="Username"
              className="w-full px-4 py-3.5 text-base font-semibold border-2 border-purple-200 rounded-2xl focus:border-purple-600 focus:outline-none"
              required
            />
            <input
              type="password"
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3.5 text-base font-semibold border-2 border-purple-200 rounded-2xl focus:border-purple-600 focus:outline-none"
              required
            />
            <p className="text-xs text-purple-700 bg-purple-50 p-2 rounded-xl text-center font-medium border border-purple-200">
              💡 Demo: admin / admin123
            </p>
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
        <p className="font-semibold text-sm">Loading DoCA Analytics Telemetry...</p>
      </div>
    );
  }

  const { overview, centreStats, payments } = stats;
  const creditedPayment = payments.find((p) => p.status === "CREDITED");
  const processingPayment = payments.find((p) => p.status === "PROCESSING");

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="glass-card p-4 flex items-center justify-between">
        <div>
          <span className="pill green mb-1">DoCA Executive</span>
          <h2 className="text-lg font-bold text-gray-900 font-heading">
            Department of Consumer Affairs Telemetry
          </h2>
          <p className="text-xs text-gray-500">
            Real-time buffer stocking & MSP procurement analytics
          </p>
        </div>

        <button
          onClick={() => {
            sessionStorage.removeItem("kisanjod_admin");
            setLoggedIn(false);
          }}
          className="text-xs text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-200 font-semibold"
        >
          {t("logout")}
        </button>
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

      {/* Centre Capacity Utilization */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-800 font-heading border-b border-gray-100 pb-2">
          🏢 Mandi Centre Capacity & Hourly Bay Load
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
'''

# -----------------------------------------------------------------------------
# 2. src/app/farmer/book/page.tsx
# -----------------------------------------------------------------------------
book_code = '''"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/i18n";

const CROPS = [
  { key: "Wheat", emoji: "🌾", category: "Grains", msp: 2275, defaultKg: 50 },
  { key: "Paddy", emoji: "🌾", category: "Grains", msp: 2183, defaultKg: 50 },
  { key: "Chana", emoji: "🫘", category: "Pulses", msp: 5440, defaultKg: 50 },
  { key: "Moong", emoji: "🫘", category: "Pulses", msp: 8558, defaultKg: 50 },
  { key: "Onion", emoji: "🧅", category: "Vegetables", msp: 1800, defaultKg: 50 },
  { key: "Tomato", emoji: "🍅", category: "Vegetables", msp: 1500, defaultKg: 25 },
  { key: "Potato", emoji: "🥔", category: "Vegetables", msp: 1200, defaultKg: 50 },
];

interface Centre {
  id: string;
  name: string;
  district: string;
  state: string;
}

interface Slot {
  hourOfDay: number;
  timeLabel: string;
  available: number;
  isFull: boolean;
}

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedCropKey = searchParams.get("crop");
  const { t } = useLanguage();

  const [step, setStep] = useState(1);
  const [selectedCrop, setSelectedCrop] = useState<typeof CROPS[0] | null>(null);

  // Requirement 5a: Direct bag count input & bag capacity in kg
  const [bagCount, setBagCount] = useState<number>(40);
  const [bagCapacityKg, setBagCapacityKg] = useState<number>(50);
  const [capacityMode, setCapacityMode] = useState<"50" | "25" | "custom">("50");

  const [centres, setCentres] = useState<Centre[]>([]);
  const [selectedCentre, setSelectedCentre] = useState<Centre | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    tokenNumber: string;
    scheduledSlotStart: string;
    scheduledSlotEnd: string;
  } | null>(null);
  const [farmerId, setFarmerId] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("kisanjod_farmer");
    if (!stored) {
      router.push("/login");
      return;
    }
    setFarmerId(JSON.parse(stored).id);
  }, [router]);

  // Handle URL pre-selection
  useEffect(() => {
    if (preSelectedCropKey) {
      const match = CROPS.find(
        (c) => c.key.toLowerCase() === preSelectedCropKey.toLowerCase()
      );
      if (match) {
        setSelectedCrop(match);
        setBagCapacityKg(match.defaultKg);
        setCapacityMode(match.defaultKg === 25 ? "25" : "50");
        setStep(2);
      }
    }
  }, [preSelectedCropKey]);

  useEffect(() => {
    if (step === 3) {
      fetch("/api/centres")
        .then((r) => r.json())
        .then((d) => setCentres(d.centres || []));
    }
  }, [step]);

  useEffect(() => {
    if (selectedCentre && selectedDate) {
      fetch(`/api/centres/${selectedCentre.id}/slots?date=${selectedDate}`)
        .then((r) => r.json())
        .then((d) => setSlots(d.slots || []));
    }
  }, [selectedCentre, selectedDate]);

  // Dynamic calculations: Total Quintals = (Bags * Capacity_kg) / 100
  const calculatedQuintals = parseFloat(
    ((bagCount * bagCapacityKg) / 100).toFixed(2)
  );
  const estimatedMinutes = 10 + Math.ceil((bagCount * 6) / 60);

  const handleConfirm = async () => {
    if (!selectedCrop || !selectedCentre || selectedSlot === null) return;
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId,
          centerId: selectedCentre.id,
          cropName: selectedCrop.key,
          packageCount: bagCount,
          date: selectedDate,
          hourOfDay: selectedSlot,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.booking);
        setStep(5);
      } else {
        alert(data.error || "Booking failed");
      }
    } catch {
      alert("Connection error");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 pb-28 max-w-xl mx-auto">
      {/* Step Indicator Bar */}
      <div className="flex gap-1.5 px-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full transition-all ${
              s <= step ? "bg-amber-400" : "bg-white/20"
            }`}
          />
        ))}
      </div>

      {/* STEP 1: CROP SELECTION */}
      {step === 1 && (
        <div className="glass-card p-6 space-y-4">
          <div>
            <span className="pill green mb-1">Step 1</span>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 font-heading">
              {t("stepCrop")}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {CROPS.map((crop) => (
              <button
                key={crop.key}
                type="button"
                onClick={() => {
                  setSelectedCrop(crop);
                  setBagCapacityKg(crop.defaultKg);
                  setCapacityMode(crop.defaultKg === 25 ? "25" : "50");
                  setStep(2);
                }}
                className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-95 focus:ring-2 focus:ring-amber-400 ${
                  selectedCrop?.key === crop.key
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-gray-200 bg-white hover:border-emerald-300"
                }`}
              >
                <span className="text-3xl block mb-1">{crop.emoji}</span>
                <p className="font-extrabold text-sm text-gray-900 font-heading">
                  {crop.key}
                </p>
                <p className="text-xs text-gray-500">{crop.category}</p>
                <p className="text-xs text-emerald-800 font-bold mt-1">
                  ₹{crop.msp}/Qtl
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: QUANTITY & BAG CAPACITY (Requirement 5a) */}
      {step === 2 && selectedCrop && (
        <div className="glass-card p-6 space-y-5">
          <div>
            <span className="pill green mb-1">Step 2</span>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 font-heading">
              {t("stepQuantity")}
            </h2>
          </div>

          {/* Selected Crop Badge */}
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
            <span className="text-3xl">{selectedCrop.emoji}</span>
            <div>
              <p className="text-sm font-extrabold text-gray-900">
                {selectedCrop.key} ({selectedCrop.category})
              </p>
              <p className="text-xs text-emerald-800 font-semibold">
                Official MSP: ₹{selectedCrop.msp}/Quintal
              </p>
            </div>
          </div>

          {/* Direct Numeric Bag Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              {t("bagsInputLabel")}
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={5000}
                value={bagCount || ""}
                onChange={(e) => setBagCount(Math.max(1, Number(e.target.value) || 0))}
                placeholder={t("bagsPlaceholder")}
                className="w-full px-4 py-3.5 text-2xl font-black text-gray-900 border-2 border-emerald-300 rounded-2xl focus:border-emerald-600 focus:bg-white focus:outline-none bg-emerald-50/20"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") setStep(3);
                }}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">
                Bags
              </span>
            </div>

            {/* Quick Increment Steppers */}
            <div className="flex gap-2 flex-wrap pt-1">
              {[
                [-10, "−10"],
                [10, "+10"],
                [50, "+50"],
                [100, "+100"],
              ].map(([val, label]) => (
                <button
                  key={String(label)}
                  type="button"
                  onClick={() => setBagCount(Math.max(1, bagCount + Number(val)))}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-800 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Bag Capacity Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              {t("capacityLabel")}
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setCapacityMode("50");
                  setBagCapacityKg(50);
                }}
                className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                  capacityMode === "50"
                    ? "bg-emerald-800 text-white border-emerald-800 shadow"
                    : "bg-white text-gray-700 border-gray-200 hover:border-emerald-400"
                }`}
              >
                50 kg (Standard)
              </button>

              <button
                type="button"
                onClick={() => {
                  setCapacityMode("25");
                  setBagCapacityKg(25);
                }}
                className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                  capacityMode === "25"
                    ? "bg-emerald-800 text-white border-emerald-800 shadow"
                    : "bg-white text-gray-700 border-gray-200 hover:border-emerald-400"
                }`}
              >
                25 kg (Crate)
              </button>

              <button
                type="button"
                onClick={() => setCapacityMode("custom")}
                className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                  capacityMode === "custom"
                    ? "bg-emerald-800 text-white border-emerald-800 shadow"
                    : "bg-white text-gray-700 border-gray-200 hover:border-emerald-400"
                }`}
              >
                Custom kg
              </button>
            </div>

            {capacityMode === "custom" && (
              <div className="pt-2">
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={bagCapacityKg}
                  onChange={(e) => setBagCapacityKg(Number(e.target.value) || 50)}
                  placeholder="Enter kg per bag"
                  className="w-full px-3 py-2 border-2 border-emerald-300 rounded-xl text-sm font-bold"
                />
              </div>
            )}
          </div>

          {/* Real-time Calculated Math Box */}
          <div className="bg-emerald-50/80 rounded-2xl p-4 border border-emerald-200 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{t("totalCalculatedWeight")}:</span>
              <strong className="text-lg font-black text-emerald-900 font-heading">
                {calculatedQuintals} Quintals
              </strong>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-600">
              <span>{t("estHandlingTime")}:</span>
              <span className="font-bold text-gray-800">
                ~{estimatedMinutes} Minutes
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-touch flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              ← {t("back")}
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="btn-touch flex-1 bg-emerald-800 hover:bg-emerald-700 text-white"
            >
              {t("next")} →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: CENTRE & TIME WINDOW */}
      {step === 3 && (
        <div className="glass-card p-6 space-y-4">
          <div>
            <span className="pill green mb-1">Step 3</span>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 font-heading">
              {t("stepCentre")}
            </h2>
          </div>

          <div className="space-y-2.5">
            {centres.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCentre(c)}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                  selectedCentre?.id === c.id
                    ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-400"
                    : "border-gray-200 bg-white hover:border-emerald-300"
                }`}
              >
                <p className="font-bold text-sm text-gray-900">🏢 {c.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  📍 {c.district}, {c.state}
                </p>
              </button>
            ))}
          </div>

          {selectedCentre && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  {t("selectDate")}
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-3.5 border-2 border-emerald-300 rounded-2xl bg-white text-base font-bold"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  {t("availableSlots")}
                </p>
                <div className="space-y-2">
                  {slots
                    .filter((s) => !s.isFull)
                    .map((s) => (
                      <button
                        key={s.hourOfDay}
                        type="button"
                        onClick={() => {
                          setSelectedSlot(s.hourOfDay);
                          setStep(4);
                        }}
                        className={`w-full p-3.5 rounded-xl border-2 text-left flex justify-between items-center transition-all ${
                          selectedSlot === s.hourOfDay
                            ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-400"
                            : "border-gray-200 bg-white hover:border-emerald-300"
                        }`}
                      >
                        <span className="font-bold text-sm text-gray-900">
                          🕐 {s.timeLabel}
                        </span>
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                          {s.available} {t("slotsLeft")}
                        </span>
                      </button>
                    ))}

                  {slots.filter((s) => !s.isFull).length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-4 bg-gray-50 rounded-xl">
                      {t("noSlots")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn-touch flex-1 bg-gray-100 text-gray-700"
            >
              ← {t("back")}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: CONFIRMATION */}
      {step === 4 && selectedCrop && selectedCentre && (
        <div className="glass-card p-6 space-y-4">
          <div>
            <span className="pill green mb-1">Step 4</span>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 font-heading">
              {t("stepConfirm")}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">{t("stepCrop")}:</span>
              <strong className="text-gray-900">
                {selectedCrop.emoji} {selectedCrop.key}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payload:</span>
              <strong className="text-gray-900">
                {bagCount} Bags × {bagCapacityKg} kg = {calculatedQuintals} Qtl
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Centre:</span>
              <strong className="text-gray-900">{selectedCentre.name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date:</span>
              <strong className="text-gray-900">{selectedDate}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Slot Window:</span>
              <strong className="text-emerald-800">
                {String(selectedSlot).padStart(2, "0")}:00 -{" "}
                {String((selectedSlot || 0) + 1).padStart(2, "0")}:00
              </strong>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2 text-sm">
              <span className="text-gray-600 font-bold">Total Estimated Value:</span>
              <strong className="text-emerald-900 font-extrabold font-heading">
                ₹{(calculatedQuintals * selectedCrop.msp).toLocaleString("en-IN")}
              </strong>
            </div>
          </div>

          <p className="text-[11px] text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
            ⚠️ {t("centerLockedNotice")}
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="btn-touch flex-1 bg-gray-100 text-gray-700"
            >
              ← {t("back")}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="btn-touch flex-1 bg-emerald-800 hover:bg-emerald-700 text-white disabled:opacity-50"
            >
              {loading ? "Issuing Token..." : `✓ ${t("confirmBookingBtn")}`}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: SUCCESS */}
      {step === 5 && result && (
        <div className="glass-card p-8 text-center space-y-5">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100">
            <span className="text-4xl">✅</span>
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-emerald-900 font-heading">
              {t("bookingSuccessTitle")}
            </h2>
            <p className="text-xs text-gray-500 mt-1">{t("centerLockedNotice")}</p>
          </div>

          <div className="bg-[#072a1e] text-white rounded-3xl p-6 shadow-xl max-w-sm mx-auto">
            <p className="text-xs uppercase tracking-widest text-emerald-300">
              {t("yourToken")}
            </p>
            <p className="text-5xl font-black tracking-tight my-2 text-white font-heading">
              {result.tokenNumber}
            </p>
            <p className="text-xs text-emerald-200 font-semibold mt-2">
              📅 {result.scheduledSlotStart} - {result.scheduledSlotEnd}
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/farmer/dashboard")}
            className="btn-touch w-full bg-emerald-800 text-white font-bold"
          >
            {t("goToDashboard")} →
          </button>
        </div>
      )}
    </div>
  );
}

export default function BookSlotPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-12 text-white">Loading Booking Engine...</div>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
'''

# -----------------------------------------------------------------------------
# 3. src/app/farmer/dashboard/page.tsx
# -----------------------------------------------------------------------------
dashboard_code = '''"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";

interface FarmerData {
  id: string;
  fullName: string;
  maskedAadhaar: string;
  district: string;
  state: string;
  village: string;
  landRecords: Array<{
    verifiedSownCrop: string;
    sownAreaAcres: number;
    maxProcurementQuotaQtl: number;
    utilizedQuotaQtl: number;
    remainingQuotaQtl: number;
    khasraNumber: string;
  }>;
  bankAccount: { bankName: string; accountMasked: string; ifsc: string } | null;
}

interface BookingData {
  id: string;
  tokenNumber: string;
  cropName: string;
  status: string;
  scheduledSlotStart: string;
  scheduledSlotEnd: string;
  bookedDate: string;
  estimatedQuantityQtl: number;
  centerId: string;
  center: { name: string; district: string };
  procurementBill?: {
    netAmountPayable: number;
    billNumber: string;
    dbtPayment?: { status: string; bankUtr: string | null; pfmsReferenceNumber: string };
  };
}

export default function FarmerDashboard() {
  const router = useRouter();
  const { t } = useLanguage();

  const [farmer, setFarmer] = useState<FarmerData | null>(null);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("kisanjod_farmer");
    if (!stored) {
      router.push("/login");
      return;
    }
    const f = JSON.parse(stored);
    setFarmer(f);

    fetch(`/api/bookings?farmerId=${f.id}`)
      .then((r) => r.json())
      .then((d) => {
        setBookings(d.bookings || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (!farmer) return null;

  const activeBooking = bookings.find((b) =>
    ["WAITING", "CALLED", "AT_BAY", "STANDBY"].includes(b.status)
  );

  const completedBookings = bookings.filter((b) => b.status === "COMPLETED");
  const totalCompletedQuintals = completedBookings.reduce(
    (acc, curr) => acc + curr.estimatedQuantityQtl,
    0
  );
  const lastPayment = completedBookings[0]?.procurementBill?.netAmountPayable || 113750;

  // Format today's date
  const todayFormatted = new Date()
    .toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();

  return (
    <div className="space-y-6 pb-28 max-w-4xl mx-auto">
      {/* Welcome & Eyebrow Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-white">
        <div>
          <p className="text-[11px] font-extrabold tracking-widest text-emerald-200/90 uppercase mb-1">
            {todayFormatted}
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading text-white">
            Hello, {farmer.fullName.split(" ")[0]} <span>👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/80 mt-0.5">
            {t("heroSubtitle")}
          </p>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem("kisanjod_farmer");
            router.push("/login");
          }}
          className="self-start sm:self-center text-xs text-red-200 hover:text-white bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 px-3 py-1.5 rounded-xl transition-colors"
        >
          {t("logout")}
        </button>
      </div>

      {/* 1. Hero Card (Matching Reference Image) */}
      <div className="hero-card">
        <div className="relative z-10 max-w-md">
          <span className="pill light mb-3">
            ✓ {t("farmerVerified")}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight font-heading my-2">
            {t("heroTitle")}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90 mb-5 font-normal">
            {t("heroSubtitle")}
          </p>
          <Link
            href="/farmer/book"
            className="primary-button"
          >
            <span>{t("findSlot")}</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* 2. Crop Photo Strip (Matching Reference Image) */}
      <div>
        <div className="crop-photo-strip">
          <Link
            href="/farmer/book?crop=Paddy"
            className="crop-photo crop-paddy group"
          >
            <span>
              <b>{t("cropPaddy")}</b>
              <small>{t("cropPaddyDesc")}</small>
            </span>
          </Link>

          <Link
            href="/farmer/book?crop=Tomato"
            className="crop-photo crop-vegetables group"
          >
            <span>
              <b>{t("cropVegetables")}</b>
              <small>{t("cropVegetablesDesc")}</small>
            </span>
          </Link>

          <Link
            href="/farmer/book?crop=Wheat"
            className="crop-photo crop-tomatoes group"
          >
            <span>
              <b>{t("cropOther")}</b>
              <small>{t("cropOtherDesc")}</small>
            </span>
          </Link>
        </div>
      </div>

      {/* 3. Section: Your Next Visit / Active Booking */}
      {activeBooking && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-white px-1">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200">
                YOUR NEXT VISIT
              </p>
              <h3 className="text-lg font-bold font-heading text-white">
                {t("activeBooking")}
              </h3>
            </div>
            <Link
              href={`/farmer/queue?bookingId=${activeBooking.id}&centreId=${activeBooking.centerId}`}
              className="text-xs text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1"
            >
              {t("viewDetails")} →
            </Link>
          </div>

          <div className="glass-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="pill green">
                ⏱ {activeBooking.status}
              </span>
              <span className="text-lg font-black tracking-wider text-emerald-900 font-heading">
                {activeBooking.tokenNumber}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-bold text-gray-900 font-heading">
                  🏢 {activeBooking.center.name}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  📅 {activeBooking.bookedDate} &nbsp; • &nbsp; 🕐 {activeBooking.scheduledSlotStart} - {activeBooking.scheduledSlotEnd}
                </p>
                <p className="text-xs font-bold text-emerald-800 mt-1.5">
                  {activeBooking.cropName} &nbsp; • &nbsp; {activeBooking.estimatedQuantityQtl} Quintals
                </p>
              </div>

              {/* Circular Queue Ring (Matching Reference) */}
              <div className="queue-ring">
                <strong>{activeBooking.tokenNumber.replace("TK-", "")}</strong>
                <small>{t("nowServing")}</small>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-600">
              <span>
                <strong className="text-emerald-800 font-bold text-sm">
                  {activeBooking.scheduledSlotStart}
                </strong>{" "}
                {t("estimatedWait")}
              </span>
              <Link
                href={`/farmer/queue?bookingId=${activeBooking.id}&centreId=${activeBooking.centerId}`}
                className="btn-touch px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow"
              >
                {t("trackQueue")} →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 4. Section: At A Glance (This Week Stats) */}
      <div className="space-y-2.5">
        <div className="px-1 text-white">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200">
            AT A GLANCE
          </p>
          <h3 className="text-lg font-bold font-heading text-white">
            {t("thisWeek")}
          </h3>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-icon gold">◈</span>
            <div>
              <strong className="text-base text-gray-900">
                {totalCompletedQuintals || activeBooking?.estimatedQuantityQtl || 50} Qtl
              </strong>
              <small className="block text-gray-500">{t("bookedQuantity")}</small>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon purple">₹</span>
            <div>
              <strong className="text-base text-gray-900">
                ₹{lastPayment.toLocaleString("en-IN")}
              </strong>
              <small className="block text-gray-500">{t("lastPayment")}</small>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon blue">✓</span>
            <div>
              <strong className="text-base text-gray-900">
                {completedBookings.length || 1}
              </strong>
              <small className="block text-gray-500">{t("completedVisits")}</small>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Land & Quota Records Card */}
      {farmer.landRecords.length > 0 && (
        <div className="glass-card p-5 space-y-3">
          <h4 className="text-sm font-bold text-gray-800 font-heading flex items-center gap-1.5">
            <span>📋</span> {t("landRecordTitle")}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-gray-500">{t("khasra")}</span>
              <p className="font-bold text-gray-900 mt-0.5">{farmer.landRecords[0].khasraNumber}</p>
            </div>
            <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-gray-500">{t("sownCrop")}</span>
              <p className="font-bold text-gray-900 mt-0.5">{farmer.landRecords[0].verifiedSownCrop}</p>
            </div>
            <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-gray-500">{t("sownArea")}</span>
              <p className="font-bold text-gray-900 mt-0.5">{farmer.landRecords[0].sownAreaAcres} Acres</p>
            </div>
            <div className="bg-emerald-100/80 p-2.5 rounded-xl border border-emerald-200">
              <span className="text-emerald-800 font-semibold">{t("remainingQuota")}</span>
              <p className="font-extrabold text-emerald-900 text-sm mt-0.5">
                {farmer.landRecords[0].remainingQuotaQtl} Qtl
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 6. Document Reminder Notice Box */}
      <div className="glass-card p-4 flex items-start gap-3 border-amber-200 bg-amber-50/95">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
          i
        </span>
        <div className="text-xs text-amber-900">
          <strong className="block font-bold mb-0.5">{t("bringDocuments")}</strong>
          <p className="text-amber-800">{t("bringDocumentsDesc")}</p>
        </div>
      </div>

      {/* 7. Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#072a1e]/95 backdrop-blur-md border-t border-white/10 px-4 py-2 flex justify-around items-center z-50 shadow-2xl">
        <Link
          href="/farmer/dashboard"
          className="flex flex-col items-center text-amber-400 text-xs font-bold"
        >
          <span className="text-lg">🏠</span>
          <span>{t("navHome")}</span>
        </Link>
        <Link
          href="/farmer/book"
          className="flex flex-col items-center text-white/70 hover:text-white text-xs font-medium"
        >
          <span className="text-lg">📅</span>
          <span>{t("navBook")}</span>
        </Link>
        <Link
          href={
            activeBooking
              ? `/farmer/queue?bookingId=${activeBooking.id}&centreId=${activeBooking.centerId}`
              : "/farmer/book"
          }
          className="flex flex-col items-center text-white/70 hover:text-white text-xs font-medium"
        >
          <span className="text-lg">⏳</span>
          <span>{t("navQueue")}</span>
        </Link>
        <Link
          href="/farmer/payments"
          className="flex flex-col items-center text-white/70 hover:text-white text-xs font-medium"
        >
          <span className="text-lg">💰</span>
          <span>{t("navPayments")}</span>
        </Link>
      </nav>
    </div>
  );
}
'''

# -----------------------------------------------------------------------------
# 4. src/app/farmer/payments/page.tsx
# -----------------------------------------------------------------------------
payments_code = '''"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";

interface BookingData {
  id: string;
  tokenNumber: string;
  cropName: string;
  status: string;
  bookedDate: string;
  estimatedQuantityQtl: number;
  center: { name: string; district: string };
  procurementBill?: {
    billNumber: string;
    netWeightQtl: number;
    notifiedMspRate: number;
    netAmountPayable: number;
    qualityGrade: string;
    dbtPayment?: {
      status: string;
      bankUtr: string | null;
      pfmsReferenceNumber: string;
      bankName: string;
      beneficiaryMaskedAc: string;
    };
  };
}

export default function PaymentsPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("kisanjod_farmer");
    if (!stored) {
      router.push("/login");
      return;
    }
    const f = JSON.parse(stored);
    fetch(`/api/bookings?farmerId=${f.id}`)
      .then((r) => r.json())
      .then((d) => {
        setBookings(
          (d.bookings || []).filter((b: BookingData) => b.procurementBill)
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center text-white">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold">Loading payment transactions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28 max-w-xl mx-auto">
      <div className="flex items-center justify-between text-white px-1">
        <h2 className="text-xl sm:text-2xl font-extrabold font-heading">
          {t("paymentsTitle")}
        </h2>
        <span className="text-xs bg-white/15 px-3 py-1 rounded-full font-bold border border-white/20">
          PFMS & DBT
        </span>
      </div>

      {bookings.length === 0 ? (
        <div className="glass-card p-8 text-center space-y-3">
          <p className="text-4xl">💰</p>
          <p className="text-gray-500 font-semibold text-sm">
            {t("noPayments")}
          </p>
          <Link
            href="/farmer/book"
            className="inline-block mt-2 px-5 py-2.5 bg-emerald-800 text-white rounded-xl text-xs font-bold shadow"
          >
            {t("findSlot")} →
          </Link>
        </div>
      ) : (
        bookings.map((b) => (
          <div
            key={b.id}
            className="glass-card p-5 space-y-4 shadow-xl border border-gray-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <p className="font-extrabold text-base text-gray-900 font-heading">
                  {b.tokenNumber} &nbsp;•&nbsp; {b.cropName}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  🏢 {b.center.name} ({b.bookedDate})
                </p>
              </div>

              <span
                className={`text-xs px-3 py-1.5 rounded-full font-bold shadow-sm ${
                  b.procurementBill?.dbtPayment?.status === "CREDITED"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-amber-100 text-amber-800 border border-amber-300"
                }`}
              >
                {b.procurementBill?.dbtPayment?.status === "CREDITED"
                  ? `✓ ${t("stageCredited")}`
                  : `⏳ ${t("stageProcessing")}`}
              </span>
            </div>

            {/* 2-Step Progress Indicator */}
            <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-100 space-y-2">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Direct Benefit Transfer (DBT) Milestones
              </p>
              <div className="flex items-center gap-2 px-1">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shadow">
                    ✓
                  </div>
                  <p className="text-[10px] font-bold text-gray-700 mt-1">
                    J-Form Bill
                  </p>
                </div>

                <div
                  className={`flex-1 h-1.5 rounded-full transition-all ${
                    b.procurementBill?.dbtPayment?.status === "CREDITED"
                      ? "bg-emerald-600"
                      : "bg-amber-300 animate-pulse"
                  }`}
                />

                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      b.procurementBill?.dbtPayment?.status === "CREDITED"
                        ? "bg-emerald-700 text-white shadow"
                        : "bg-amber-200 text-amber-900 border border-amber-400"
                    }`}
                  >
                    {b.procurementBill?.dbtPayment?.status === "CREDITED"
                      ? "✓"
                      : "⏳"}
                  </div>
                  <p className="text-[10px] font-bold text-gray-700 mt-1">
                    Bank Credit
                  </p>
                </div>
              </div>
            </div>

            {/* Bill Key Figures */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <span className="text-gray-500">{t("billNo")}</span>
                <p className="font-bold text-gray-900 mt-0.5 truncate">
                  {b.procurementBill?.billNumber}
                </p>
              </div>

              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <span className="text-gray-500">{t("netWeight")}</span>
                <p className="font-bold text-gray-900 mt-0.5">
                  {b.procurementBill?.netWeightQtl} Qtl
                </p>
              </div>

              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <span className="text-gray-500">{t("mspRate")}</span>
                <p className="font-bold text-gray-900 mt-0.5">
                  ₹{b.procurementBill?.notifiedMspRate}/Qtl
                </p>
              </div>

              <div className="bg-emerald-100 p-2.5 rounded-xl border border-emerald-300">
                <span className="text-emerald-800 font-bold">{t("amountPayable")}</span>
                <p className="font-extrabold text-emerald-950 text-sm mt-0.5">
                  ₹{b.procurementBill?.netAmountPayable?.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            {/* Banking & Treasury Audit Metadata */}
            {b.procurementBill?.dbtPayment && (
              <div className="bg-white rounded-2xl p-3.5 space-y-1.5 text-xs border border-gray-200 text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("bank")}:</span>
                  <strong className="text-gray-900">
                    {b.procurementBill.dbtPayment.bankName} (
                    {b.procurementBill.dbtPayment.beneficiaryMaskedAc})
                  </strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">{t("pfmsRef")}:</span>
                  <strong className="text-gray-900 font-mono">
                    {b.procurementBill.dbtPayment.pfmsReferenceNumber}
                  </strong>
                </div>

                {b.procurementBill.dbtPayment.bankUtr && (
                  <div className="flex justify-between border-t border-gray-100 pt-1 text-emerald-800">
                    <span className="font-bold">{t("utr")}:</span>
                    <strong className="font-mono font-bold">
                      {b.procurementBill.dbtPayment.bankUtr}
                    </strong>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#072a1e]/95 backdrop-blur-md border-t border-white/10 px-4 py-2 flex justify-around items-center z-50 shadow-2xl">
        <Link
          href="/farmer/dashboard"
          className="flex flex-col items-center text-white/70 hover:text-white text-xs font-medium"
        >
          <span className="text-lg">🏠</span>
          <span>{t("navHome")}</span>
        </Link>
        <Link
          href="/farmer/book"
          className="flex flex-col items-center text-white/70 hover:text-white text-xs font-medium"
        >
          <span className="text-lg">📅</span>
          <span>{t("navBook")}</span>
        </Link>
        <Link
          href="/farmer/dashboard"
          className="flex flex-col items-center text-white/70 hover:text-white text-xs font-medium"
        >
          <span className="text-lg">⏳</span>
          <span>{t("navQueue")}</span>
        </Link>
        <Link
          href="/farmer/payments"
          className="flex flex-col items-center text-amber-400 text-xs font-bold"
        >
          <span className="text-lg">💰</span>
          <span>{t("navPayments")}</span>
        </Link>
      </nav>
    </div>
  );
}
'''

# -----------------------------------------------------------------------------
# 5. src/app/farmer/queue/page.tsx
# -----------------------------------------------------------------------------
queue_code = '''"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";

interface QueueResponse {
  centreId: string;
  date: string;
  currentlyServing: {
    tokenNumber: string;
    farmerName: string;
    cropName: string;
    status: string;
    bayAssigned: number;
  } | null;
  waitingQueue: Array<{
    id: string;
    tokenNumber: string;
    farmerName: string;
    cropName: string;
    packageCount: number;
    estimatedQtl: number;
    scheduledSlot: string;
    dynamicEta: string;
    delayMinutes: number;
  }>;
  standbyQueue: Array<{
    id: string;
    tokenNumber: string;
    farmerName: string;
  }>;
  completedCount: number;
  totalBooked: number;
}

function QueueContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get("bookingId");
  const centreId = searchParams.get("centreId");
  const { t, locale } = useLanguage();

  const [queueData, setQueueData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [myTokenNumber, setMyTokenNumber] = useState<string>("");
  const [myStatus, setMyStatus] = useState<string>("WAITING");
  const [scheduledSlot, setScheduledSlot] = useState<string>("");
  const [cropName, setCropName] = useState<string>("");

  const fetchLiveQueue = useCallback(async () => {
    if (!centreId) return;
    try {
      const res = await fetch(`/api/queue/${centreId}`);
      if (res.ok) {
        const data: QueueResponse = await res.json();
        setQueueData(data);
      }
    } catch (e) {
      console.error("Queue fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [centreId]);

  // Initial lookup of farmer's booking
  useEffect(() => {
    const stored = localStorage.getItem("kisanjod_farmer");
    if (!stored) {
      router.push("/login");
      return;
    }
    const farmer = JSON.parse(stored);

    fetch(`/api/bookings?farmerId=${farmer.id}`)
      .then((r) => r.json())
      .then((d) => {
        const allBookings = d.bookings || [];
        const matching = bookingId
          ? allBookings.find((b: { id: string }) => b.id === bookingId)
          : allBookings.find((b: { status: string }) =>
              ["WAITING", "CALLED", "AT_BAY", "STANDBY"].includes(b.status)
            );

        if (matching) {
          setMyTokenNumber(matching.tokenNumber);
          setMyStatus(matching.status);
          setScheduledSlot(
            `${matching.scheduledSlotStart} - ${matching.scheduledSlotEnd}`
          );
          setCropName(matching.cropName);
        }
      })
      .catch(console.error);
  }, [bookingId, router]);

  // Polling queue data every 4 seconds
  useEffect(() => {
    if (!centreId) return;
    fetchLiveQueue();
    const timer = setInterval(fetchLiveQueue, 4000);
    return () => clearInterval(timer);
  }, [centreId, fetchLiveQueue]);

  // Voice readout function
  const speakStatus = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = locale === "hi" ? "hi-IN" : locale === "te" ? "te-IN" : "en-IN";
      window.speechSynthesis.speak(utterance);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center text-white">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-semibold text-sm">Loading live mandi queue telemetry...</p>
      </div>
    );
  }

  // Calculate position in queue
  const waitingList = queueData?.waitingQueue || [];
  const myQueueIndex = waitingList.findIndex(
    (item) => item.tokenNumber === myTokenNumber
  );
  const farmersAhead = myQueueIndex >= 0 ? myQueueIndex : 0;
  const myWaitingItem = myQueueIndex >= 0 ? waitingList[myQueueIndex] : null;

  // Ripple ETA calculation
  const totalDelayMinutes = myWaitingItem?.delayMinutes || 0;
  const liveEta =
    myWaitingItem?.dynamicEta ||
    scheduledSlot.split("-")[0]?.trim() ||
    "09:00";

  // Check special alert states
  const isCalled =
    queueData?.currentlyServing?.tokenNumber === myTokenNumber ||
    myStatus === "CALLED" ||
    myStatus === "AT_BAY";

  const isStandby =
    queueData?.standbyQueue.some((s) => s.tokenNumber === myTokenNumber) ||
    myStatus === "STANDBY";

  const isTurnNearing =
    !isCalled && !isStandby && farmersAhead === 0 && waitingList.length > 0;

  return (
    <div className="space-y-4 pb-28 max-w-lg mx-auto">
      {/* Header with back */}
      <div className="flex items-center justify-between">
        <Link
          href="/farmer/dashboard"
          className="text-xs text-white font-bold flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-2 rounded-xl border border-white/20 transition-colors"
        >
          ← {t("navHome")}
        </Link>
        <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-3 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          {t("liveQueue")}
        </span>
      </div>

      {/* 1. Turn Called Alert */}
      {isCalled && (
        <div className="bg-gradient-to-r from-purple-800 to-indigo-800 text-white rounded-3xl p-5 shadow-2xl animate-bounce text-center border border-purple-400">
          <p className="text-3xl mb-1">📢</p>
          <h3 className="text-xl font-black font-heading">{t("turnCalledTitle")}</h3>
          <p className="text-xs text-purple-100 mt-1">
            Token <strong>{myTokenNumber}</strong>: {t("turnCalledDesc")}
          </p>
          <button
            onClick={() =>
              speakStatus(
                `Token ${myTokenNumber}. Your turn is called. Please proceed immediately to Bay 1.`
              )
            }
            className="mt-3 bg-white text-purple-900 font-bold px-4 py-2 rounded-xl text-xs shadow hover:bg-purple-50"
          >
            🔊 {t("tapToSpeak")}
          </button>
        </div>
      )}

      {/* 2. 10-Minute Turn Countdown Alert */}
      {isTurnNearing && (
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-3xl p-5 shadow-xl text-center border border-amber-300">
          <p className="text-2xl mb-1">⚠️</p>
          <h3 className="text-lg font-black font-heading">
            {t("turnApproachingTitle")}
          </h3>
          <p className="text-xs text-amber-100 mt-1">
            {t("turnApproachingDesc")}
          </p>
          <button
            onClick={() =>
              speakStatus(
                "Ahead farmer processing is completing. Your turn will be in approximately 10 minutes. Please arrive at the bay holding area."
              )
            }
            className="mt-3 bg-white text-amber-900 font-bold px-4 py-1.5 rounded-xl text-xs shadow hover:bg-amber-50"
          >
            🔊 {t("tapToSpeak")}
          </button>
        </div>
      )}

      {/* 3. Standby Alert */}
      {isStandby && (
        <div className="bg-gradient-to-r from-amber-700 to-orange-800 text-white rounded-3xl p-5 shadow-xl text-center border border-amber-400">
          <p className="text-2xl mb-1">⏸️</p>
          <h3 className="text-lg font-black font-heading">{t("standbyTitle")}</h3>
          <p className="text-xs text-amber-100 mt-1">{t("standbyDesc")}</p>
        </div>
      )}

      {/* Main Token Hero Card */}
      <div className="bg-[#072a1e] text-white rounded-3xl p-6 shadow-2xl text-center relative overflow-hidden border border-white/10">
        <div className="flex items-center justify-between text-xs text-emerald-200 mb-2">
          <span>{cropName || "Crop"}</span>
          <button
            onClick={() =>
              speakStatus(
                `Your token is ${myTokenNumber}. There are ${farmersAhead} farmers ahead of you.`
              )
            }
            className="bg-white/15 hover:bg-white/20 text-white px-3 py-1 rounded-full flex items-center gap-1 text-xs border border-white/20"
          >
            🔊 {t("tapToSpeak")}
          </button>
        </div>

        <p className="text-xs uppercase tracking-widest text-emerald-300 font-bold">
          {t("yourTokenNumber")}
        </p>
        <p className="text-5xl font-black tracking-tight my-2 text-white font-heading">
          {myTokenNumber || "TK-002"}
        </p>

        {/* Live Ripple ETA Display */}
        <div className="mt-4 bg-emerald-950/70 rounded-2xl p-3 border border-emerald-800/80 flex items-center justify-around text-left">
          <div>
            <p className="text-[11px] text-emerald-300">{t("scheduledTime")}</p>
            <p className="text-sm font-bold text-white">
              {scheduledSlot || "09:00 - 09:30"}
            </p>
          </div>
          <div className="h-8 w-px bg-emerald-800" />
          <div>
            <p className="text-[11px] text-amber-300 flex items-center gap-1 font-bold">
              {t("liveRippleEta")}
              {totalDelayMinutes > 0 && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                  +{totalDelayMinutes}m
                </span>
              )}
            </p>
            <p className="text-base font-extrabold text-amber-400 font-heading">
              {liveEta} AM
            </p>
          </div>
        </div>
      </div>

      {/* Queue Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Currently Serving */}
        <div className="glass-card p-4 text-center">
          <span className="text-2xl block mb-1">🚜</span>
          <p className="text-xs text-gray-500 font-medium">{t("atWeighbridge")}</p>
          <p className="text-2xl font-black text-emerald-950 mt-0.5 font-heading">
            {queueData?.currentlyServing?.tokenNumber || "None"}
          </p>
          <p className="text-[11px] text-emerald-800 font-semibold truncate">
            {queueData?.currentlyServing
              ? `Bay ${queueData.currentlyServing.bayAssigned} (${queueData.currentlyServing.cropName})`
              : "Bay Idle"}
          </p>
        </div>

        {/* Ahead Count */}
        <div className="glass-card p-4 text-center">
          <span className="text-2xl block mb-1">👥</span>
          <p className="text-xs text-gray-500 font-medium">{t("farmersAhead")}</p>
          <p className="text-2xl font-black text-amber-600 mt-0.5 font-heading">
            {farmersAhead}
          </p>
          <p className="text-[11px] text-gray-500">
            {farmersAhead === 0 ? t("youAreNext") : `~${farmersAhead * 15} min wait`}
          </p>
        </div>
      </div>

      {/* Today's Queue Timeline */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <h4 className="text-sm font-bold text-gray-800 font-heading">
            {t("mandiLineup")}
          </h4>
          <span className="text-xs text-gray-500">
            {queueData?.completedCount || 0} done • {waitingList.length} in line
          </span>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {waitingList.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">
              No waiting tokens currently in line
            </p>
          ) : (
            waitingList.map((item, idx) => {
              const isMe = item.tokenNumber === myTokenNumber;
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                    isMe
                      ? "bg-emerald-50 border-emerald-500 font-bold shadow-sm ring-2 ring-emerald-400"
                      : "bg-gray-50/70 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        isMe
                          ? "bg-emerald-800 text-white"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-gray-900 font-bold">
                        {item.tokenNumber} {isMe && "(YOU)"}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {item.cropName} • {item.estimatedQtl} Qtl
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-800">
                      {item.dynamicEta}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {item.scheduledSlot}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#072a1e]/95 backdrop-blur-md border-t border-white/10 px-4 py-2 flex justify-around items-center z-50 shadow-2xl">
        <Link
          href="/farmer/dashboard"
          className="flex flex-col items-center text-white/70 hover:text-white text-xs font-medium"
        >
          <span className="text-lg">🏠</span>
          <span>{t("navHome")}</span>
        </Link>
        <Link
          href="/farmer/book"
          className="flex flex-col items-center text-white/70 hover:text-white text-xs font-medium"
        >
          <span className="text-lg">📅</span>
          <span>{t("navBook")}</span>
        </Link>
        <Link
          href={`/farmer/queue?bookingId=${bookingId}&centreId=${centreId}`}
          className="flex flex-col items-center text-amber-400 text-xs font-bold"
        >
          <span className="text-lg">⏳</span>
          <span>{t("navQueue")}</span>
        </Link>
        <Link
          href="/farmer/payments"
          className="flex flex-col items-center text-white/70 hover:text-white text-xs font-medium"
        >
          <span className="text-lg">💰</span>
          <span>{t("navPayments")}</span>
        </Link>
      </nav>
    </div>
  );
}

export default function FarmerQueuePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] text-white text-sm">
          Loading Live Queue...
        </div>
      }
    >
      <QueueContent />
    </Suspense>
  );
}
'''

files_to_write = {
    os.path.join(BASE_DIR, "src", "app", "admin", "page.tsx"): admin_code,
    os.path.join(BASE_DIR, "src", "app", "farmer", "book", "page.tsx"): book_code,
    os.path.join(BASE_DIR, "src", "app", "farmer", "dashboard", "page.tsx"): dashboard_code,
    os.path.join(BASE_DIR, "src", "app", "farmer", "payments", "page.tsx"): payments_code,
    os.path.join(BASE_DIR, "src", "app", "farmer", "queue", "page.tsx"): queue_code,
}

for path, code in files_to_write.items():
    with open(path, "w", encoding="utf-8") as f:
        f.write(code.strip() + "\n")
    print(f"Wrote clean file: {path}")

print("All 5 clean files written successfully!")
