import os

BASE_DIR = r"c:\Users\rohit\OneDrive\Desktop\KisanJod"

# -----------------------------------------------------------------------------
# 1. src/app/layout.tsx
# -----------------------------------------------------------------------------
layout_code = '''import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import GlobalHeader from "@/components/GlobalHeader";

export const metadata: Metadata = {
  title: "KisanJod - Mandi Slot Booking & Procurement PWA",
  description: "Digital Agricultural Procurement Platform for Department of Consumer Affairs (DoCA)",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#072a1e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased selection:bg-emerald-200">
        <LanguageProvider>
          <div className="flex flex-col min-h-screen">
            <GlobalHeader />
            <main className="flex-1 mx-auto max-w-5xl w-full px-3 py-5 sm:px-6">
              {children}
            </main>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
'''

# -----------------------------------------------------------------------------
# 2. src/app/page.tsx
# -----------------------------------------------------------------------------
home_code = '''"use client";

import UnifiedLoginPage from "./login/page";

export default function Home() {
  return <UnifiedLoginPage />;
}
'''

# -----------------------------------------------------------------------------
# 3. src/app/login/page.tsx
# -----------------------------------------------------------------------------
login_code = '''"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";

type LoginRole = "farmer" | "operator" | "admin";

export default function UnifiedLoginPage() {
  const router = useRouter();
  const { t } = useLanguage();

  // Role State (Farmer by default as requested)
  const [role, setRole] = useState<LoginRole>("farmer");

  // Farmer Auth State
  const [step, setStep] = useState<"aadhaar" | "otp">("aadhaar");
  const [aadhaar, setAadhaar] = useState("");
  const [otp, setOtp] = useState("");
  const [farmerId, setFarmerId] = useState("");
  const [farmerName, setFarmerName] = useState("");

  // Operator Auth State
  const [empId, setEmpId] = useState("EMP-LUD-001");
  const [pin, setPin] = useState("1234");

  // Admin Auth State
  const [adminUser, setAdminUser] = useState("admin");
  const [adminPass, setAdminPass] = useState("admin123");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Farmer Step 1: Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    const cleaned = aadhaar.replace(/\\s/g, "");
    if (cleaned.length !== 12 || !/^\\d+$/.test(cleaned)) {
      setError("Please enter a valid 12-digit Aadhaar number");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaarNumber: cleaned }),
      });
      const data = await res.json();
      if (data.success) {
        setFarmerId(data.farmerId);
        setFarmerName(data.fullName);
        setStep("otp");
      } else {
        setError(data.error || "Aadhaar number not found in records");
      }
    } catch {
      setError("Network connection error");
    }
    setLoading(false);
  };

  // Farmer Step 2: Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    if (otp.length !== 6) {
      setError("Please enter 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmerId, otp }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("kisanjod_farmer", JSON.stringify(data.farmer));
        router.push("/farmer/dashboard");
      } else {
        setError(data.error || "Invalid OTP");
      }
    } catch {
      setError("Network connection error");
    }
    setLoading(false);
  };

  // Operator Submit
  const handleOperatorLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/operator/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: empId, pin }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("kisanjod_operator", JSON.stringify(data.operator));
        router.push("/operator");
      } else {
        setError(data.error || "Invalid Employee ID or PIN");
      }
    } catch {
      setError("Connection error");
    }
    setLoading(false);
  };

  // Admin Submit
  const handleAdminLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    if (adminUser === "admin" && adminPass === "admin123") {
      sessionStorage.setItem("kisanjod_admin", "true");
      router.push("/admin");
    } else {
      setError("Invalid admin credentials");
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-6 px-2">
      <div className="w-full max-w-lg glass-card p-6 sm:p-8 relative">
        {/* Top Header Row with Role Switcher Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-5 border-b border-gray-200/80">
          <div>
            <span className="pill green mb-1">
              ✓ {role === "farmer" ? t("roleFarmer") : role === "operator" ? t("roleOperator") : t("roleAdmin")}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 font-heading">
              {role === "farmer" ? t("farmerLogin") : role === "operator" ? t("operatorLogin") : t("adminLogin")}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {role === "farmer"
                ? t("farmerLoginSubtitle")
                : role === "operator"
                ? t("operatorSubtitle")
                : t("adminSubtitle")}
            </p>
          </div>

          {/* Role Segmented Switcher */}
          <div className="flex bg-gray-100/90 rounded-xl p-1 self-start sm:self-center border border-gray-200">
            <button
              type="button"
              onClick={() => {
                setRole("farmer");
                setError("");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                role === "farmer"
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              🌾 {t("roleFarmer")}
            </button>
            <button
              type="button"
              onClick={() => {
                setRole("operator");
                setError("");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                role === "operator"
                  ? "bg-white text-blue-800 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              👷 {t("roleOperator")}
            </button>
            <button
              type="button"
              onClick={() => {
                setRole("admin");
                setError("");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                role === "admin"
                  ? "bg-white text-purple-800 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              🏛️ {t("roleAdmin")}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 bg-red-50/90 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* 1. FARMER LOGIN FORM */}
        {role === "farmer" && (
          <>
            {step === "aadhaar" ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    {t("aadhaarLabel")}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={14}
                      value={aadhaar}
                      onChange={(e) =>
                        setAadhaar(e.target.value.replace(/[^\\d\\s]/g, ""))
                      }
                      placeholder={t("aadhaarPlaceholder")}
                      className="w-full px-4 py-3.5 text-lg font-semibold tracking-wide border-2 border-emerald-200/80 rounded-2xl focus:border-emerald-600 focus:bg-white focus:outline-none bg-emerald-50/30 transition-colors"
                      autoFocus
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl">
                      🪪
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-gray-500">
                    💡 <strong>Demo Aadhaar:</strong> 548912345678 (Gurpreet) • 432187654321 (Venkata) • 987654321012 (Ramesh)
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-touch w-full bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg disabled:opacity-50"
                >
                  {loading ? t("sendingOtp") : `${t("sendOtp")} →`}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <p className="text-xs text-emerald-800">
                    Welcome, <strong>{farmerName}</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    {t("otpLabel")}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\\D/g, ""))}
                    placeholder="123456"
                    className="w-full px-4 py-3.5 text-2xl font-extrabold text-center tracking-[0.4em] border-2 border-emerald-200 rounded-2xl focus:border-emerald-600 focus:bg-white focus:outline-none bg-emerald-50/30"
                    autoFocus
                    required
                  />
                  <p className="mt-2 text-xs text-amber-800 bg-amber-50 p-2 rounded-xl text-center font-bold border border-amber-200/80">
                    💡 {t("otpHint")}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-touch w-full bg-gradient-to-r from-emerald-800 to-emerald-700 text-white shadow-lg disabled:opacity-50"
                >
                  {loading ? t("verifying") : `✓ ${t("verifyOtp")}`}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("aadhaar");
                    setOtp("");
                    setError("");
                  }}
                  className="w-full text-xs text-emerald-700 font-semibold hover:underline text-center block pt-1"
                >
                  ← {t("changeAadhaar")}
                </button>
              </form>
            )}
          </>
        )}

        {/* 2. OPERATOR LOGIN FORM */}
        {role === "operator" && (
          <form onSubmit={handleOperatorLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {t("employeeId")}
              </label>
              <input
                type="text"
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                placeholder={t("employeePlaceholder")}
                className="w-full px-4 py-3.5 text-base font-semibold border-2 border-blue-200 rounded-2xl focus:border-blue-600 focus:bg-white focus:outline-none bg-blue-50/30"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {t("pin")}
              </label>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="4-digit PIN"
                className="w-full px-4 py-3.5 text-xl font-bold text-center tracking-[0.4em] border-2 border-blue-200 rounded-2xl focus:border-blue-600 focus:bg-white focus:outline-none bg-blue-50/30"
                required
              />
              <p className="mt-2 text-xs text-blue-700 bg-blue-50 p-2 rounded-xl text-center font-medium border border-blue-200/80">
                💡 Demo: EMP-LUD-001 / PIN: 1234
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-touch w-full bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-lg disabled:opacity-50"
            >
              {loading ? t("loggingIn") : `${t("login")} →`}
            </button>
          </form>
        )}

        {/* 3. ADMIN LOGIN FORM */}
        {role === "admin" && (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {t("username")}
              </label>
              <input
                type="text"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                placeholder="admin"
                className="w-full px-4 py-3.5 text-base font-semibold border-2 border-purple-200 rounded-2xl focus:border-purple-600 focus:bg-white focus:outline-none bg-purple-50/30"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {t("password")}
              </label>
              <input
                type="password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                placeholder="admin123"
                className="w-full px-4 py-3.5 text-base font-semibold border-2 border-purple-200 rounded-2xl focus:border-purple-600 focus:bg-white focus:outline-none bg-purple-50/30"
                required
              />
              <p className="mt-2 text-xs text-purple-700 bg-purple-50 p-2 rounded-xl text-center font-medium border border-purple-200/80">
                💡 Demo: admin / admin123
              </p>
            </div>

            <button
              type="submit"
              className="btn-touch w-full bg-gradient-to-r from-purple-700 to-purple-600 text-white shadow-lg"
            >
              {t("login")} →
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
'''

# -----------------------------------------------------------------------------
# 4. src/app/operator/page.tsx
# -----------------------------------------------------------------------------
operator_code = '''"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n";

interface QueueItem {
  id: string;
  tokenNumber: string;
  farmerName: string;
  cropName: string;
  packageCount: number;
  estimatedQtl: number;
  scheduledSlot: string;
  dynamicEta: string;
  delayMinutes: number;
}

interface CurrentToken {
  tokenNumber: string;
  farmerName: string;
  cropName: string;
  status: string;
  bayAssigned: number;
}

interface OperatorData {
  id: string;
  employeeId: string;
  fullName: string;
  center: { id: string; name: string; centerCode: string; district: string };
}

export default function OperatorPage() {
  const { t } = useLanguage();
  const [loggedIn, setLoggedIn] = useState(false);
  const [operator, setOperator] = useState<OperatorData | null>(null);
  const [empId, setEmpId] = useState("EMP-LUD-001");
  const [pin, setPin] = useState("1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Queue state
  const [currentlyServing, setCurrentlyServing] = useState<CurrentToken | null>(
    null
  );
  const [waitingQueue, setWaitingQueue] = useState<QueueItem[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalBooked, setTotalBooked] = useState(0);

  // Processing form
  const [processing, setProcessing] = useState<QueueItem | null>(null);
  const [grossWeight, setGrossWeight] = useState("");
  const [tareWeight, setTareWeight] = useState("");
  const [grade, setGrade] = useState("FAQ");
  const [moisture, setMoisture] = useState("12");
  const [billResult, setBillResult] = useState<{
    billNumber: string;
    netWeightQtl: number;
    mspRate: number;
    netPayable: number;
    pfmsRef?: string;
  } | null>(null);

  const fetchQueue = useCallback(async () => {
    if (!operator) return;
    try {
      const res = await fetch(`/api/queue/${operator.center.id}`);
      const data = await res.json();
      setCurrentlyServing(data.currentlyServing);
      setWaitingQueue(data.waitingQueue || []);
      setCompletedCount(data.completedCount || 0);
      setTotalBooked(data.totalBooked || 0);
    } catch {
      /* silent */
    }
  }, [operator]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("kisanjod_operator");
      if (stored) {
        setOperator(JSON.parse(stored));
        setLoggedIn(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (loggedIn && operator) {
      fetchQueue();
      const interval = setInterval(fetchQueue, 4000);
      return () => clearInterval(interval);
    }
  }, [loggedIn, operator, fetchQueue]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/operator/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: empId, pin }),
      });
      const data = await res.json();
      if (data.success) {
        setOperator(data.operator);
        localStorage.setItem(
          "kisanjod_operator",
          JSON.stringify(data.operator)
        );
        setLoggedIn(true);
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Connection error");
    }
    setLoading(false);
  };

  const callNext = async () => {
    if (!operator) return;
    await fetch("/api/operator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "call_next", centerId: operator.center.id }),
    });
    fetchQueue();
  };

  const putStandby = async (bookingId: string) => {
    await fetch("/api/operator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "standby", bookingId }),
    });
    fetchQueue();
  };

  const submitProcessing = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!processing || !operator || !grossWeight || !tareWeight) return;
    setLoading(true);
    try {
      const res = await fetch("/api/operator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "process",
          bookingId: processing.id,
          centerId: operator.center.id,
          operatorId: operator.id,
          gradeData: {
            qualityGrade: grade,
            moisturePct: parseFloat(moisture),
            grossWeightQtl: parseFloat(grossWeight),
            tareWeightQtl: parseFloat(tareWeight),
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBillResult(data.bill);
        setProcessing(null);
        fetchQueue();
      } else {
        alert(data.error || "Processing failed");
      }
    } catch {
      alert("Error");
    }
    setLoading(false);
  };

  // Login Screen
  if (!loggedIn) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md glass-card p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-3">
              <span className="text-3xl">👷</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 font-heading">
              {t("operatorLogin")}
            </h2>
            <p className="text-xs text-gray-500 mt-1">{t("operatorSubtitle")}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {t("employeeId")}
              </label>
              <input
                type="text"
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                placeholder="EMP-LUD-001"
                className="w-full px-4 py-3.5 text-base font-semibold border-2 border-blue-200 rounded-2xl focus:border-blue-600 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {t("pin")}
              </label>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="1234"
                className="w-full px-4 py-3.5 text-xl font-bold text-center tracking-[0.4em] border-2 border-blue-200 rounded-2xl focus:border-blue-600 focus:outline-none"
                required
              />
              <p className="mt-2 text-xs text-blue-700 bg-blue-50 p-2 rounded-xl text-center font-medium border border-blue-200">
                💡 Demo: EMP-LUD-001 / PIN: 1234
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-touch w-full bg-blue-700 hover:bg-blue-800 text-white shadow-lg disabled:opacity-50"
            >
              {loading ? t("loggingIn") : `${t("login")} →`}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Bill Success Screen
  if (billResult) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="glass-card p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold text-emerald-900 font-heading">
            Digital J-Form Generated!
          </h2>

          <div className="bg-emerald-50/80 rounded-2xl p-4 space-y-2 text-xs text-left border border-emerald-200">
            <p>
              <span className="text-gray-500">Bill No:</span>{" "}
              <strong>{billResult.billNumber}</strong>
            </p>
            <p>
              <span className="text-gray-500">Net Weight:</span>{" "}
              <strong>{billResult.netWeightQtl} Quintals</strong>
            </p>
            <p>
              <span className="text-gray-500">Official MSP Rate:</span>{" "}
              <strong>₹{billResult.mspRate}/Qtl</strong>
            </p>
            <p>
              <span className="text-gray-500">Total Payout:</span>{" "}
              <strong className="text-emerald-900 text-sm font-extrabold font-heading">
                ₹{billResult.netPayable.toLocaleString("en-IN")}
              </strong>
            </p>
            <p>
              <span className="text-gray-500">PFMS Ref:</span>{" "}
              <strong className="font-mono text-gray-700">
                {billResult.pfmsRef}
              </strong>
            </p>
          </div>

          <button
            type="button"
            onClick={() => setBillResult(null)}
            className="btn-touch w-full bg-emerald-800 text-white font-bold"
          >
            ← Back to Mandi Queue
          </button>
        </div>
      </div>
    );
  }

  // Processing Weighbridge Form
  if (processing) {
    const netWt =
      grossWeight && tareWeight
        ? (parseFloat(grossWeight) - parseFloat(tareWeight)).toFixed(2)
        : "0.00";

    return (
      <div className="space-y-4 max-w-lg mx-auto pb-12">
        <div className="flex items-center justify-between text-white">
          <h2 className="text-xl font-bold font-heading">
            Process Token {processing.tokenNumber}
          </h2>
          <button
            type="button"
            onClick={() => setProcessing(null)}
            className="text-xs bg-red-500/20 text-red-200 px-3 py-1 rounded-xl border border-red-400/30"
          >
            Cancel
          </button>
        </div>

        <div className="glass-card p-4 text-xs font-semibold text-gray-700 flex justify-between">
          <span>👨‍🌾 {processing.farmerName}</span>
          <span>{processing.cropName}</span>
          <span>{processing.estimatedQtl} Qtl (est.)</span>
        </div>

        <form onSubmit={submitProcessing} className="glass-card p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                {t("grossWeight")}
              </label>
              <input
                type="number"
                step="0.1"
                value={grossWeight}
                onChange={(e) => setGrossWeight(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl text-base font-bold"
                placeholder="52.5"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                {t("tareWeight")}
              </label>
              <input
                type="number"
                step="0.1"
                value={tareWeight}
                onChange={(e) => setTareWeight(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl text-base font-bold"
                placeholder="12.5"
                required
              />
            </div>
          </div>

          <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-200">
            <span className="text-xs text-gray-500">{t("netWeight")}</span>
            <p className="text-2xl font-black text-emerald-900 font-heading">
              {netWt} Quintals
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                {t("grade")}
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm font-bold bg-white"
              >
                <option value="FAQ">FAQ (Standard)</option>
                <option value="GRADE_A">Grade A (Premium)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                {t("moisture")}
              </label>
              <input
                type="number"
                step="0.1"
                value={moisture}
                onChange={(e) => setMoisture(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm font-bold"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !grossWeight || !tareWeight}
            className="btn-touch w-full bg-emerald-800 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
          >
            {loading ? "Processing..." : `✓ ${t("submitBill")}`}
          </button>
        </form>
      </div>
    );
  }

  // Queue Dashboard
  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-12">
      {/* Operator Header */}
      <div className="glass-card p-4 flex items-center justify-between">
        <div>
          <span className="pill green mb-1">Mandi Staff</span>
          <h2 className="text-lg font-bold text-gray-900 font-heading">
            {operator?.center.name}
          </h2>
          <p className="text-xs text-gray-500">
            {operator?.fullName} ({operator?.employeeId})
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            localStorage.removeItem("kisanjod_operator");
            setLoggedIn(false);
          }}
          className="text-xs text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-200 font-semibold"
        >
          {t("logout")}
        </button>
      </div>

      {/* Stats Counters */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="glass-card p-3">
          <p className="text-2xl font-black text-blue-700 font-heading">
            {totalBooked}
          </p>
          <p className="text-[11px] text-gray-500 font-bold uppercase">Booked</p>
        </div>

        <div className="glass-card p-3">
          <p className="text-2xl font-black text-amber-600 font-heading">
            {waitingQueue.length}
          </p>
          <p className="text-[11px] text-gray-500 font-bold uppercase">Waiting</p>
        </div>

        <div className="glass-card p-3">
          <p className="text-2xl font-black text-emerald-700 font-heading">
            {completedCount}
          </p>
          <p className="text-[11px] text-gray-500 font-bold uppercase">Completed</p>
        </div>
      </div>

      {/* Now Serving Bay Card */}
      {currentlyServing && (
        <div className="glass-card p-4 border-2 border-blue-400 bg-blue-50/90">
          <p className="text-xs text-blue-800 font-bold mb-1">
            🔵 NOW SERVING — Bay {currentlyServing.bayAssigned}
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-black text-blue-950 font-heading">
                {currentlyServing.tokenNumber}
              </p>
              <p className="text-xs text-gray-600 font-semibold mt-0.5">
                {currentlyServing.farmerName} &nbsp;•&nbsp; {currentlyServing.cropName}
              </p>
            </div>

            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-200 text-blue-900">
              {currentlyServing.status}
            </span>
          </div>
        </div>
      )}

      {/* Action Button: Call Next */}
      <button
        type="button"
        onClick={callNext}
        className="btn-touch w-full bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-bold shadow-lg"
      >
        📢 {t("callNext")}
      </button>

      {/* Waiting Queue List */}
      <div className="glass-card p-4 space-y-3">
        <h3 className="text-sm font-bold text-gray-800 font-heading border-b border-gray-100 pb-2">
          Waiting Queue ({waitingQueue.length})
        </h3>

        {waitingQueue.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">
            No farmers waiting currently
          </p>
        ) : (
          <div className="space-y-2">
            {waitingQueue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 border border-gray-200 text-xs"
              >
                <div className="flex-1">
                  <p className="font-extrabold text-gray-900 text-sm">
                    {item.tokenNumber} — {item.farmerName}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {item.cropName} • {item.estimatedQtl} Qtl • {item.scheduledSlot}
                  </p>
                </div>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setProcessing(item);
                      setGrossWeight("");
                      setTareWeight("");
                    }}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-sm"
                  >
                    Weigh
                  </button>
                  <button
                    type="button"
                    onClick={() => putStandby(item.id)}
                    className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-bold border border-amber-300"
                  >
                    Standby
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
'''

all_files = {
    os.path.join(BASE_DIR, "src", "app", "layout.tsx"): layout_code,
    os.path.join(BASE_DIR, "src", "app", "page.tsx"): home_code,
    os.path.join(BASE_DIR, "src", "app", "login", "page.tsx"): login_code,
    os.path.join(BASE_DIR, "src", "app", "operator", "page.tsx"): operator_code,
}

for path, code in all_files.items():
    with open(path, "w", encoding="utf-8") as f:
        f.write(code.strip() + "\n")
    print(f"Wrote file cleanly: {path}")

print("All clean files written successfully!")
