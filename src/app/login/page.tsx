"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";

type LoginRole = "farmer" | "operator" | "admin";

export default function UnifiedLoginPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [checkingAuth, setCheckingAuth] = useState(true);

  // If already authenticated, immediately redirect to corresponding portal
  useEffect(() => {
    try {
      const farmer = localStorage.getItem("kisanjod_farmer");
      if (farmer) {
        router.replace("/farmer/dashboard");
        return;
      }
      const operator = localStorage.getItem("kisanjod_operator");
      if (operator) {
        router.replace("/operator");
        return;
      }
      const admin = localStorage.getItem("kisanjod_admin") || sessionStorage.getItem("kisanjod_admin");
      if (admin) {
        router.replace("/admin");
        return;
      }
    } catch {
      // ignore
    }
    setCheckingAuth(false);
  }, [router]);

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
    const cleaned = aadhaar.replace(/\s/g, "");
    if (cleaned.length !== 12 || !/^\d+$/.test(cleaned)) {
      setError(t("invalidAadhaar"));
      return;
    }
    const firstDigit = cleaned[0];
    if (!["1", "2", "3"].includes(firstDigit)) {
      setError("Invalid Aadhaar number (Testing rule: Must start with 1, 2, or 3)");
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
        setError(data.error || t("aadhaarNotFound"));
      }
    } catch {
      setError(t("networkError"));
    }
    setLoading(false);
  };

  // Farmer Step 2: Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    if (otp.length !== 6) {
      setError(t("invalidOtp"));
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
        localStorage.removeItem("kisanjod_operator");
        localStorage.removeItem("kisanjod_admin");
        sessionStorage.removeItem("kisanjod_admin");
        localStorage.setItem("kisanjod_farmer", JSON.stringify(data.farmer));
        window.dispatchEvent(new Event("kisanjod_auth_change"));
        router.push("/farmer/dashboard");
      } else {
        setError(data.error || t("invalidOtp"));
      }
    } catch {
      setError(t("networkError"));
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
        localStorage.removeItem("kisanjod_farmer");
        localStorage.removeItem("kisanjod_admin");
        sessionStorage.removeItem("kisanjod_admin");
        localStorage.setItem("kisanjod_operator", JSON.stringify(data.operator));
        window.dispatchEvent(new Event("kisanjod_auth_change"));
        router.push("/operator");
      } else {
        setError(data.error || t("invalidOperator"));
      }
    } catch {
      setError(t("connectionError"));
    }
    setLoading(false);
  };

  // Admin Submit
  const handleAdminLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    if (adminUser === "admin" && adminPass === "admin123") {
      localStorage.removeItem("kisanjod_farmer");
      localStorage.removeItem("kisanjod_operator");
      sessionStorage.setItem("kisanjod_admin", "true");
      localStorage.setItem("kisanjod_admin", "true");
      window.dispatchEvent(new Event("kisanjod_auth_change"));
      router.push("/admin");
    } else {
      setError(t("invalidAdmin"));
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center py-6 px-2">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-6 px-2">
      <div className="w-full max-w-lg glass-card p-6 sm:p-8 relative">
        {/* Top Header Row: If OTP step, show Welcome Farmer; otherwise show role header */}
        {role === "farmer" && step === "otp" ? (
          <div className="flex items-center gap-3.5 pb-5 mb-5 border-b border-emerald-100">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100/70 border border-emerald-200 text-2xl shadow-xs overflow-hidden">
              <img
                src="/icons/farmer-avatar.svg"
                alt="Farmer Profile"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 font-heading leading-tight">
                {t("welcome")}, {farmerName}
              </h2>
              <p className="text-xs text-emerald-800 font-bold mt-0.5 flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Aadhaar verified • Enter 6-digit OTP to continue
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-5 border-b border-gray-200/80">
            <div>
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
          </div>
        )}

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
                      onChange={(e) => {
                        const rawDigits = e.target.value.replace(/\D/g, "").slice(0, 12);
                        const formatted = rawDigits
                          .replace(/(\d{4})(?=\d)/g, "$1 ")
                          .trim();
                        setAadhaar(formatted);
                      }}
                      placeholder="1234 5678 9012"
                      className="w-full px-4 py-3.5 text-lg font-semibold tracking-wide border-2 border-emerald-200/80 rounded-2xl focus:border-emerald-600 focus:bg-white focus:outline-none bg-emerald-50/30 transition-colors"
                      autoFocus
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl">
                      🪪
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">
                    💡 <strong>Test Mode Active:</strong> Enter any 12-digit Aadhaar! 
                    <br />
                    • 1st digit <strong>1</strong> = Farmer 1 (Gurpreet) | <strong>2</strong> = Farmer 2 (Venkata) | <strong>3</strong> = Farmer 3 (Ramesh)
                    <br />
                    • Any other starting digit (0, 4–9) = <strong>Invalid Aadhaar</strong>
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
                {/* Masked Aadhaar Badge */}
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-xs">
                  <div className="flex items-center gap-2 text-emerald-950 font-bold">
                    <span>🪪</span>
                    <span className="text-gray-600">Aadhaar:</span>
                    <span className="font-mono tracking-wider font-extrabold text-emerald-900">
                      {aadhaar ? `•••• •••• ${aadhaar.replace(/\s/g, "").slice(-4)}` : "•••• •••• 5678"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("aadhaar");
                      setOtp("");
                      setError("");
                    }}
                    className="text-emerald-700 hover:text-emerald-900 font-extrabold text-[11px] underline underline-offset-2 transition-colors"
                  >
                    {t("changeAadhaar")}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                    {t("otpLabel")}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full px-4 py-3.5 text-2xl sm:text-3xl font-black text-center tracking-[0.35em] border-2 border-emerald-300 rounded-2xl focus:border-emerald-600 focus:bg-white focus:outline-none bg-emerald-50/40 text-gray-900 font-mono shadow-inner transition-all"
                    autoFocus
                    required
                  />
                  <p className="mt-2 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl text-center font-bold border border-amber-200/80">
                    💡 {t("otpHint")}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-touch w-full bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg disabled:opacity-50"
                >
                  {loading ? t("verifying") : `✓ ${t("verifyOtp")} & Enter Portal`}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("aadhaar");
                    setOtp("");
                    setError("");
                  }}
                  className="w-full text-xs text-gray-500 font-bold hover:text-emerald-800 text-center block pt-1 transition-colors"
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
                placeholder={t("pinPlaceholder")}
                className="w-full px-4 py-3.5 text-xl font-bold text-center tracking-[0.4em] border-2 border-blue-200 rounded-2xl focus:border-blue-600 focus:bg-white focus:outline-none bg-blue-50/30"
                required
              />
              <p className="mt-2 text-xs text-blue-700 bg-blue-50 p-2 rounded-xl text-center font-medium border border-blue-200/80">
                💡 {t("demo")}: EMP-LUD-001 / PIN: 1234
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
