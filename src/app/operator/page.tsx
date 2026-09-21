"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n";
import { to12Hour, formatApproxTimeRange12h } from "@/lib/timeFormat";
import { Eye, EyeOff } from "lucide-react";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useInstantSync } from "@/lib/useInstantSync";

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
  id?: string;
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
  const [showPin, setShowPin] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [registrationDrawerOpen, setRegistrationDrawerOpen] = useState(false);
  const [registrationSearch, setRegistrationSearch] = useState("");
  const [allCentres, setAllCentres] = useState<Array<{ id: string; name: string; centerCode?: string; district: string }>>([]);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [confirmStandbyId, setConfirmStandbyId] = useState<string | null>(null);
  const [activeWorkers, setActiveWorkers] = useState<number>(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Mandi Operating Sessions Configuration
  const [morningStart, setMorningStart] = useState("09:00");
  const [morningEnd, setMorningEnd] = useState("13:00");
  const [afternoonStart, setAfternoonStart] = useState("15:00");
  const [afternoonEnd, setAfternoonEnd] = useState("17:00");
  const [isEditingSessions, setIsEditingSessions] = useState(false);
  const [savingSessions, setSavingSessions] = useState(false);
  const [sessionSuccessMsg, setSessionSuccessMsg] = useState("");

  // Queue state
  const [currentlyServing, setCurrentlyServing] = useState<CurrentToken | null>(
    null
  );
  const [waitingQueue, setWaitingQueue] = useState<QueueItem[]>([]);
  const [standbyQueue, setStandbyQueue] = useState<QueueItem[]>([]);
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
      const res = await fetch(`/api/queue/${operator.center.id}?date=${selectedDate}`);
      const data = await res.json();
      setCurrentlyServing(data.currentlyServing);
      setWaitingQueue(data.waitingQueue || []);
      setStandbyQueue(data.standbyQueue || []);
      setCompletedCount(data.completedCount || 0);
      setTotalBooked(data.totalBooked || 0);
    } catch {
      /* silent */
    }
  }, [operator, selectedDate]);

  const fetchCentreSettings = useCallback(async () => {
    if (!operator) return;
    try {
      const res = await fetch("/api/centres");
      const data = await res.json();
      if (data.centres && Array.isArray(data.centres)) {
        setAllCentres(data.centres);
      }
      const myCentre = data.centres?.find((c: { id: string; activeWorkers?: number; morningSessionStart?: string; morningSessionEnd?: string; afternoonSessionStart?: string; afternoonSessionEnd?: string }) => c.id === operator.center.id);
      if (myCentre) {
        if (myCentre.activeWorkers) setActiveWorkers(myCentre.activeWorkers);
        if (myCentre.morningSessionStart) setMorningStart(myCentre.morningSessionStart);
        if (myCentre.morningSessionEnd) setMorningEnd(myCentre.morningSessionEnd);
        if (myCentre.afternoonSessionStart) setAfternoonStart(myCentre.afternoonSessionStart);
        if (myCentre.afternoonSessionEnd) setAfternoonEnd(myCentre.afternoonSessionEnd);
      }
    } catch {}
  }, [operator]);

  const handleSaveSessions = async () => {
    if (!operator) return;
    setSavingSessions(true);
    try {
      const res = await fetch("/api/centres", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centerId: operator.center.id,
          activeWorkers: Number(activeWorkers),
          morningSessionStart: morningStart,
          morningSessionEnd: morningEnd,
          afternoonSessionStart: afternoonStart,
          afternoonSessionEnd: afternoonEnd,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSessionSuccessMsg("Operating hours and palledar gang updated successfully!");
        setTimeout(() => setSessionSuccessMsg(""), 3500);
        setIsEditingSessions(false);
      }
    } catch {
      setError("Failed to update operating hours");
    }
    setSavingSessions(false);
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem("kisanjod_operator");
      if (stored) {
        setOperator(JSON.parse(stored));
        setLoggedIn(true);
      }
    } catch {}
  }, []);

  // Zero-delay instant sync over SSE stream and BroadcastChannel
  useInstantSync(() => {
    if (loggedIn && operator) {
      fetchQueue();
    }
  });

  useEffect(() => {
    if (loggedIn && operator) {
      fetchQueue();
      fetchCentreSettings();
      // Gentle 15-second safety heartbeat (SSE handles real-time instant sync)
      const interval = setInterval(fetchQueue, 15000);
      return () => clearInterval(interval);
    }
  }, [loggedIn, operator, fetchQueue, fetchCentreSettings]);

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
        localStorage.removeItem("kisanjod_farmer");
        localStorage.removeItem("kisanjod_admin");
        sessionStorage.removeItem("kisanjod_admin");
        setOperator(data.operator);
        localStorage.setItem(
          "kisanjod_operator",
          JSON.stringify(data.operator)
        );
        window.dispatchEvent(new Event("kisanjod_auth_change"));
        setLoggedIn(true);
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError(t("connectionError"));
    }
    setLoading(false);
  };

  const broadcastSync = () => {
    try {
      window.dispatchEvent(new Event("kisanjod_sync"));
      localStorage.setItem("kisanjod_sync_ping", String(Date.now()));
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const bc = new BroadcastChannel("kisanjod_sync");
        bc.postMessage({ type: "SYNC", timestamp: Date.now() });
        bc.close();
      }
    } catch {}
  };

  const handleSwitchCenter = (newCenterId: string) => {
    const found = allCentres.find((c) => c.id === newCenterId);
    if (found && operator) {
      const updatedOp: OperatorData = {
        ...operator,
        center: {
          id: found.id,
          name: found.name,
          centerCode: (found as any).centerCode || "",
          district: found.district || "",
        },
      };
      setOperator(updatedOp);
      localStorage.setItem("kisanjod_operator", JSON.stringify(updatedOp));
      window.dispatchEvent(new Event("kisanjod_auth_change"));
      broadcastSync();
    }
  };

  const callNext = async () => {
    if (!operator) return;
    await fetch("/api/operator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "call_next", centerId: operator.center.id }),
    });
    fetchQueue();
    broadcastSync();
  };

  const putStandby = async (bookingId: string) => {
    await fetch("/api/operator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "standby", bookingId }),
    });
    fetchQueue();
    broadcastSync();
  };

  const resumeStandby = async (bookingId: string) => {
    try {
      const res = await fetch("/api/operator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume_standby", bookingId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchQueue();
        broadcastSync();
      } else {
        setError(data.error || "Failed to recall token from standby");
      }
    } catch {
      setError("Failed to recall token from standby");
    }
  };

  const cancelToken = async (bookingId: string) => {
    await fetch("/api/operator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", bookingId }),
    });
    fetchQueue();
    broadcastSync();
  };

  const completeToken = async (bookingId: string) => {
    await fetch("/api/operator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", bookingId }),
    });
    fetchQueue();
    broadcastSync();
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
        broadcastSync();
      } else {
        setError(data.error || "Processing failed");
      }
    } catch {
      setError("Weighment submission error. Please check values and try again.");
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
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="1234"
                  className="w-full px-4 py-3.5 pr-12 text-xl font-bold text-center tracking-[0.4em] border-2 border-blue-200 rounded-2xl focus:border-blue-600 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-blue-700 transition-colors"
                  title={showPin ? "Hide PIN" : "Show PIN"}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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
              <span className="text-gray-500">{t("officialMsp")}:</span>{" "}
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
            {loading ? t("processing") : `✓ ${t("submitBill")}`}
          </button>
        </form>
      </div>
    );
  }

  // Queue Dashboard
  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-12">
      {/* Active Procurement Center Desk & Switcher (No external Logout button) */}
      <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-3 border-l-4 border-emerald-600 bg-white/95 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 text-2xl font-bold shadow-2xs">
            🏢
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
              Procurement Center Desk
            </span>
            <h2 className="text-base sm:text-lg font-black text-gray-900 font-heading leading-tight mt-0.5">
              {operator?.center.name}
            </h2>
            <p className="text-xs text-gray-500 font-semibold">
              Operator Station: {operator?.fullName} ({operator?.employeeId})
            </p>
          </div>
        </div>

        {allCentres.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="center-switcher" className="text-xs font-bold text-gray-500 hidden sm:inline">
              Switch Center:
            </label>
            <select
              id="center-switcher"
              value={operator?.center.id}
              onChange={(e) => handleSwitchCenter(e.target.value)}
              className="text-xs font-extrabold bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
            >
              {allCentres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.district})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Date Picker */}
      <div className="flex items-center gap-3 mt-3">
        <label className="text-[10px] font-black uppercase tracking-wider text-gray-500">Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-300 bg-white text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {/* Mandi Operating Sessions Configuration Card */}
      <div className="glass-card p-4 space-y-3 border-l-4 border-blue-600">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
              <span>⏱️</span> Mandi Operating Sessions & Lunch Break
            </h3>
            <p className="text-[11px] text-gray-500">
              Morning: {to12Hour(morningStart)} – {to12Hour(morningEnd)} • Lunch Break ({to12Hour(morningEnd)} – {to12Hour(afternoonStart)}) • Afternoon: {to12Hour(afternoonStart)} – {to12Hour(afternoonEnd)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingSessions(!isEditingSessions)}
            className="text-xs px-3 py-1.5 rounded-xl font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
          >
            {isEditingSessions ? "Cancel" : "⚙️ Edit Hours"}
          </button>
        </div>

        {sessionSuccessMsg && (
          <p className="text-xs text-emerald-800 bg-emerald-50 p-2 rounded-xl border border-emerald-200 font-bold">
            ✓ {sessionSuccessMsg}
          </p>
        )}

        {isEditingSessions && (
          <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  🌅 Morning Session Start
                </label>
                <input
                  type="time"
                  value={morningStart}
                  onChange={(e) => setMorningStart(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  🌅 Morning Session End
                </label>
                <input
                  type="time"
                  value={morningEnd}
                  onChange={(e) => setMorningEnd(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  ☀️ Afternoon Session Start
                </label>
                <input
                  type="time"
                  value={afternoonStart}
                  onChange={(e) => setAfternoonStart(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  ☀️ Afternoon Session End
                </label>
                <input
                  type="time"
                  value={afternoonEnd}
                  onChange={(e) => setAfternoonEnd(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold"
                />
              </div>
            </div>

            {/* Palledar Gang Concurrency */}
            <div className="p-2.5 bg-white rounded-xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-extrabold text-blue-950">👥 Active Palledar Gang</span>
                <p className="text-[10px] text-gray-500">Mandi laborers team (~3 min/bag standard for 4 workers)</p>
              </div>
              <div className="flex gap-1">
                {[2, 4, 6, 8].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setActiveWorkers(w)}
                    className={`px-3 py-1 rounded-lg font-black text-xs border transition-all ${
                      activeWorkers === w
                        ? "bg-blue-700 text-white border-blue-800 shadow-xs"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {w} {w === 4 ? "(Std 4)" : "Workers"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-blue-900 font-semibold">
                🍽️ Lunch break: {to12Hour(morningEnd)} – {to12Hour(afternoonStart)}
              </span>
              <button
                type="button"
                onClick={handleSaveSessions}
                disabled={savingSessions}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-black text-xs rounded-xl shadow-sm disabled:opacity-50"
              >
                {savingSessions ? "Saving..." : "Save Operating Hours"}
              </button>
            </div>
          </div>
        )}
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

      {/* Daily Registrations Register Toggle */}
      <button
        type="button"
        onClick={() => setRegistrationDrawerOpen(!registrationDrawerOpen)}
        className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-bold text-gray-800 transition-all"
      >
        <span>📋 Daily Registrations Register ({selectedDate})</span>
        <span className={`transition-transform ${registrationDrawerOpen ? "rotate-180" : ""}`}>▼</span>
      </button>

      {registrationDrawerOpen && (
        <div className="border border-gray-200 rounded-2xl bg-white p-4 space-y-3 animate-in slide-in-from-top duration-200">
          {/* Search */}
          <input
            type="text"
            value={registrationSearch}
            onChange={(e) => setRegistrationSearch(e.target.value)}
            placeholder="Search by Token or Farmer Name..."
            className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm font-semibold placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-400"
          />
          {/* Registration List */}
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {[...(waitingQueue || []), ...(currentlyServing ? [currentlyServing] : [])]
              .filter((b) => {
                if (!registrationSearch) return true;
                const q = registrationSearch.toLowerCase();
                return (
                  b.tokenNumber?.toLowerCase().includes(q) ||
                  b.farmerName?.toLowerCase().includes(q)
                );
              })
              .sort((a, b) => (a.tokenNumber || "").localeCompare(b.tokenNumber || ""))
              .map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50 text-xs">
                  <div>
                    <span className="font-black text-gray-900">{b.tokenNumber}</span>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="font-bold text-gray-700">{b.farmerName || "Farmer"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-semibold">{b.cropName || "—"}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      !("status" in b) || b.status === "WAITING" ? "bg-gray-100 text-gray-700" :
                      b.status === "CALLED" || b.status === "AT_BAY" ? "bg-green-100 text-green-800" :
                      b.status === "STANDBY" ? "bg-amber-100 text-amber-800" :
                      b.status === "COMPLETED" ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-700"
                    }`}>{!("status" in b) ? "WAITING" : b.status}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Now Serving Card */}
      {currentlyServing && (
        <div className="glass-card p-4 border-2 border-blue-400 bg-blue-50/90 space-y-3">
          <p className="text-xs text-blue-800 font-bold">
            🔵 NOW SERVING — Bay {currentlyServing.bayAssigned}
            🔵 NOW SERVING — {currentlyServing.tokenNumber}
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

          {currentlyServing.id && (
            <div className="flex gap-2 pt-1 border-t border-blue-200/80">
              <button
                type="button"
                onClick={() => completeToken(currentlyServing.id!)}
                className="flex-1 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs rounded-xl font-bold shadow-sm"
              >
                ✓ Complete
              </button>
              <button
                type="button"
                onClick={() => setConfirmCancelId(currentlyServing.id!)}
                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs rounded-xl font-bold border border-red-300"
              >
                ✕ Cancel
              </button>
            </div>
          )}
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
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-gray-50/80 border border-gray-200 text-xs"
              >
                <div className="flex-1">
                  <p className="font-extrabold text-gray-900 text-sm">
                    {item.tokenNumber} — {item.farmerName}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {item.cropName} • {item.estimatedQtl} Qtl • {item.scheduledSlot.includes("-") ? formatApproxTimeRange12h(item.scheduledSlot.split("-")[0].trim(), item.scheduledSlot.split("-")[1].trim()) : to12Hour(item.scheduledSlot)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setProcessing(item);
                      setGrossWeight("");
                      setTareWeight("");
                    }}
                    className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-sm"
                  >
                    Weigh
                  </button>
                  <button
                    type="button"
                    onClick={() => completeToken(item.id)}
                    className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg font-bold border border-emerald-300"
                  >
                    ✓ Complete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmStandbyId(item.id)}
                    className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-bold border border-amber-300"
                  >
                    Standby
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmCancelId(item.id)}
                    className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-bold border border-red-300"
                  >
                    ✕ Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Standby Queue List */}
      {standbyQueue.length > 0 && (
        <div className="glass-card p-4 space-y-3 border border-amber-300/80 bg-amber-50/40">
          <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
            <h3 className="text-sm font-bold text-amber-900 font-heading flex items-center gap-1.5">
              <span>⏸️</span>
              <span>Standby Queue ({standbyQueue.length})</span>
            </h3>
            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full">
              Farmers on Hold
            </span>
          </div>

          <div className="space-y-2">
            {standbyQueue.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-white/90 border border-amber-200 text-xs shadow-xs"
              >
                <div className="flex-1">
                  <p className="font-extrabold text-gray-900 text-sm">
                    {item.tokenNumber} — {item.farmerName}
                  </p>
                  <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                    Mandi gate arrival pending / standby
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => resumeStandby(item.id)}
                    className="px-3 py-1.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-lg font-bold shadow-xs"
                  >
                    📢 Call to Bay
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProcessing(item);
                      setGrossWeight("");
                      setTareWeight("");
                    }}
                    className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs"
                  >
                    Weigh
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmCancelId(item.id)}
                    className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-bold border border-red-300"
                  >
                    ✕ Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personalized Confirmation Modals */}

      {confirmCancelId && (
        <ConfirmationModal
          isOpen={!!confirmCancelId}
          title="Cancel Farmer Token?"
          message="Are you sure you want to cancel this booking? The farmer will receive an immediate notification and will need to book a new session."
          confirmLabel="Yes, Cancel Token"
          cancelLabel="Keep Token"
          variant="danger"
          onConfirm={async () => {
            const id = confirmCancelId;
            setConfirmCancelId(null);
            await cancelToken(id);
          }}
          onCancel={() => setConfirmCancelId(null)}
        />
      )}

      {confirmStandbyId && (
        <ConfirmationModal
          isOpen={!!confirmStandbyId}
          title="Move Token to Standby?"
          message="Put this farmer on standby? Their slot will be held while subsequent waiting farmers are called."
          confirmLabel="Move to Standby"
          cancelLabel="Back"
          variant="warning"
          onConfirm={async () => {
            const id = confirmStandbyId;
            setConfirmStandbyId(null);
            await putStandby(id);
          }}
          onCancel={() => setConfirmStandbyId(null)}
        />
      )}
    </div>
  );
}
