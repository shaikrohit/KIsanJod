"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { to12Hour, formatApproxTimeRange12h } from "@/lib/timeFormat";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useInstantSync } from "@/lib/useInstantSync";

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
  estimatedQuantityQtl: number;
  scheduledDate?: string;
  scheduledSlot?: string;
  scheduledSlotStart: string;
  scheduledSlotEnd: string;
  bookedDate: string;
  status: string;
  centerId: string;
  center?: { name: string; district: string; state?: string };
  packageCount?: number;
  unitType?: string;
  bayAssigned?: number | null;
  sessionName?: string;
  qcPassed?: boolean | null;
  weighbridgeNetWeight?: number | null;
  procurementBill?: {
    billNumber?: string;
    totalPayout?: number;
    netAmountPayable?: number;
    netWeightQtl?: number;
    notifiedMspRate?: number;
    qualityGrade?: string;
    mspRatePerQtl?: number;
    dbtPayment?: { status: string; bankUtr: string | null; pfmsReferenceNumber: string };
  };
}

export default function FarmerDashboard() {
  const router = useRouter();
  const { t } = useLanguage();

  const [farmer, setFarmer] = useState<FarmerData | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("kisanjod_farmer");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return null;
  });
  const [bookings, setBookings] = useState<BookingData[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("kisanjod_farmer");
        if (stored) {
          const f = JSON.parse(stored);
          const cached = sessionStorage.getItem("kisanjod_farmer_bookings_" + f.id);
          if (cached) return JSON.parse(cached);
        }
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("kisanjod_farmer");
        if (stored) {
          const f = JSON.parse(stored);
          const cached = sessionStorage.getItem("kisanjod_farmer_bookings_" + f.id);
          if (cached) return false;
        }
      } catch {}
    }
    return true;
  });
  const [confirmCancelBookingId, setConfirmCancelBookingId] = useState<string | null>(null);
  const [confirmRescheduleBooking, setConfirmRescheduleBooking] = useState<BookingData | null>(null);
  const [liveQueue, setLiveQueue] = useState<{
    currentlyServing: {
      tokenNumber: string;
      farmerName: string;
      cropName: string;
      status: string;
      bayAssigned?: number | null;
      sessionName?: string;
    } | null;
    waitingQueue: Array<{
      id: string;
      tokenNumber: string;
      cropName: string;
      scheduledSlot: string;
      dynamicEta?: string;
      delayMinutes?: number;
    }>;
  } | null>(null);

  const bookingsRef = useRef<BookingData[]>(bookings);
  bookingsRef.current = bookings;

  const activeBooking = bookings.find((b) =>
    ["WAITING", "CALLED", "AT_BAY", "STANDBY"].includes(b.status)
  );

  const fetchBookings = useCallback((targetFarmerId?: string) => {
    const id = targetFarmerId || farmer?.id;
    if (!id) return;
    fetch(`/api/bookings?farmerId=${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Fetch failed");
        return r.json();
      })
      .then((d) => {
        if (d && Array.isArray(d.bookings)) {
          setBookings(d.bookings);
          try {
            sessionStorage.setItem("kisanjod_farmer_bookings_" + id, JSON.stringify(d.bookings));
          } catch {}
        }
        setLoading(false);
      })
      .catch(() => {
        // Never reset bookings on network blips to prevent UI flickering
        setLoading(false);
      });
  }, [farmer?.id]);

  const fetchQueue = useCallback(() => {
    const currentBookings = bookingsRef.current;
    const active = currentBookings.find((b) =>
      ["WAITING", "CALLED", "AT_BAY", "STANDBY"].includes(b.status)
    );
    const centerId = active?.centerId || currentBookings[0]?.centerId;
    if (!centerId) return;
    fetch(`/api/queue/${centerId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setLiveQueue(d);
      })
      .catch(() => {});
  }, []);

  // Zero-delay instant sync over SSE stream and BroadcastChannel
  useInstantSync(() => {
    fetchBookings();
    fetchQueue();
  });

  useEffect(() => {
    const stored = localStorage.getItem("kisanjod_farmer");
    if (!stored) {
      router.push("/login");
      return;
    }
    const f = JSON.parse(stored);
    setFarmer(f);
    fetchBookings(f.id);
    fetchQueue();

    // Gentle 15-second safety heartbeat (SSE handles real-time instant sync)
    const interval = setInterval(() => {
      fetchBookings(f.id);
      fetchQueue();
    }, 15000);
    return () => clearInterval(interval);
  }, [router, fetchBookings, fetchQueue]);

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", bookingId }),
      });
      const data = await res.json();
      if (data.success) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: "CANCELLED" } : b))
        );
      } else {
        alert(data.error || "Failed to cancel booking");
      }
    } catch {
      alert("Error canceling booking");
      /* silent */
    }
  };

  if (!farmer) return null;

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
            Mandi Procurement & Queue Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/80 mt-0.5">
            {t("heroSubtitle")}
          </p>
        </div>
      </div>

      {/* 1. Hero Card */}
      <div className="hero-card">
        <div className="relative z-10 max-w-md">
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

      {/* 2. Crop Photo Strip (Category Routed) */}
      <div>
        <div className="crop-photo-strip">
          <Link
            href="/farmer/book?crop=Paddy"
            className="crop-photo crop-paddy group"
            title="Book Paddy Slot"
          >
            <span>
              <b>{t("cropPaddy")}</b>
              <small>{t("cropPaddyDesc")}</small>
            </span>
          </Link>

          <Link
            href="/farmer/book?category=Vegetables"
            className="crop-photo crop-vegetables group"
            title="Select Vegetables (Tomato, Potato, Onion)"
          >
            <span>
              <b>{t("cropVegetables")}</b>
              <small>Tomato, Potato, Onion & Produce</small>
            </span>
          </Link>

          <Link
            href="/farmer/book?category=Grains"
            className="crop-photo crop-tomatoes group"
            title="Select Grains & Pulses (Wheat, Chana, Moong)"
          >
            <span>
              <b>Grains & Pulses</b>
              <small>Wheat, Chana, Moong & APMC Grains</small>
            </span>
          </Link>
        </div>
      </div>

      {/* 2b. Live Real-Time Operator Gate Call Banner */}
      {activeBooking && (activeBooking.status === "CALLED" || activeBooking.status === "AT_BAY") && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-4 sm:p-5 rounded-3xl shadow-xl border-2 border-emerald-300 flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-3xl sm:text-4xl">📢</span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-white text-emerald-900 px-2.5 py-0.5 rounded-full">
                GATE CALL • WEIGHBRIDGE DESK READY
              </span>
              <p className="text-base sm:text-lg font-black mt-1 leading-tight">
                Token {activeBooking.tokenNumber}: Proceed to Bay {activeBooking.bayAssigned || 1}!
              </p>
              <p className="text-xs text-emerald-100 font-medium">
                Operator has called your vehicle for weighment and digital grading.
              </p>
            </div>
          </div>
          <Link
            href={`/farmer/queue?bookingId=${activeBooking.id}&centreId=${activeBooking.centerId}`}
            className="px-4 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-black shrink-0 shadow-md transition-all active:scale-95"
          >
            Open Gate Pass →
          </Link>
        </div>
      )}

      {/* 2c. Live Real-Time Standby Banner */}
      {activeBooking && activeBooking.status === "STANDBY" && (
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-4 rounded-3xl shadow-xl border-2 border-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⏸️</span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-white text-amber-900 px-2.5 py-0.5 rounded-full">
                TOKEN ON STANDBY
              </span>
              <p className="text-sm sm:text-base font-black mt-0.5">
                Token {activeBooking.tokenNumber} is temporarily on standby
              </p>
              <p className="text-xs text-amber-100 font-medium">
                Please report to the Mandi Operator Desk at {activeBooking.center?.name || "Mandi Center"}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Section: Your Next Visit / Active Booking or Empty State */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-white px-1">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className={`absolute inline-flex h-full w-full rounded-full ${activeBooking ? "animate-ping bg-emerald-400 opacity-80" : "bg-emerald-300"}`} />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 shadow-sm" />
            </span>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200">
                {t("yourNextVisit") || "YOUR NEXT VISIT"}
              </p>
              <h3 className="text-xl font-extrabold font-heading text-white tracking-tight">
                {activeBooking ? (t("activeBooking") || "Active booking") : "Mandi Delivery Status"}
              </h3>
            </div>
          </div>
          {activeBooking && (
            <Link
              href={`/farmer/queue?bookingId=${activeBooking.id}&centreId=${activeBooking.centerId}`}
              className="text-xs text-amber-300 hover:text-amber-200 font-extrabold flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-full border border-white/20 backdrop-blur-sm transition-all shadow-sm group"
            >
              <span>{t("viewDetails") || "View details"}</span>
              <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
            </Link>
          )}
        </div>

        {activeBooking ? (() => {
          const myQueueIndex = liveQueue?.waitingQueue?.findIndex(
            (item) => item.tokenNumber === activeBooking.tokenNumber
          ) ?? -1;
          const farmersAhead = myQueueIndex >= 0 ? myQueueIndex : 0;
          const myWaitingItem = myQueueIndex >= 0 ? liveQueue?.waitingQueue[myQueueIndex] : null;
          const dynamicEta = myWaitingItem?.dynamicEta || activeBooking.scheduledSlotStart || "09:00";
          const servingToken = liveQueue?.currentlyServing?.tokenNumber;
          const servingTokenShort = servingToken ? servingToken.replace("TK-", "") : activeBooking.tokenNumber.replace("TK-", "");
          const servingBay = liveQueue?.currentlyServing?.bayAssigned || activeBooking.bayAssigned || 1;

          return (
            /* Clean, Modern APMC Digital Slot Pass */
            <div className="relative overflow-hidden rounded-3xl bg-white/95 backdrop-blur-md border border-emerald-200/80 shadow-[0_22px_50px_rgba(10,50,35,0.20)] transition-all">
              {/* Top APMC Security Ribbon */}
              <div className="h-2 w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-400" />

              <div className="p-5 sm:p-7 space-y-5">
                {/* Top Status & Token Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Status Pill */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm ${
                        activeBooking.status === "WAITING"
                          ? "bg-amber-50 text-amber-900 border border-amber-300"
                          : activeBooking.status === "CALLED"
                          ? "bg-emerald-600 text-white animate-pulse"
                          : activeBooking.status === "AT_BAY"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      <span className="text-sm">⏱</span>
                      <span>{activeBooking.status}</span>
                    </span>

                    {/* Token Pill */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-900 text-white text-xs font-black tracking-wide border border-emerald-700 shadow-xs">
                      <span>Token:</span>
                      <span className="text-amber-300 font-extrabold">{activeBooking.tokenNumber}</span>
                      <span className="text-emerald-200 text-[10px]">
                        • Bay {activeBooking.bayAssigned || 1} {activeBooking.tokenNumber.startsWith("M") ? "Morning" : "Afternoon"}
                      </span>
                    </span>
                  </div>

                  {/* Working Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmRescheduleBooking(activeBooking)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-black text-gray-800 bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-all shadow-2xs active:scale-95"
                    >
                      🗓️ Reschedule
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmCancelBookingId(activeBooking.id)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-black text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all shadow-2xs active:scale-95"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                </div>

                {/* Main Details Grid: Clear & Uncluttered */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Mandi Yard & Load Card */}
                  <div className="p-4 rounded-2xl bg-[#f8faf9] border border-gray-200/80 space-y-2.5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-2xs border border-gray-200">
                        🏢
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                          Procurement Centre
                        </p>
                        <p className="text-sm font-black text-gray-900 truncate">
                          {activeBooking.center?.name || "APMC Procurement Center"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {activeBooking.center?.district || "APMC Regulated Mandi"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 pt-2.5 border-t border-gray-200/60">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-2xs border border-gray-200">
                        🌾
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                          Commodity & Load
                        </p>
                        <p className="text-sm font-black text-emerald-950 truncate">
                          {activeBooking.cropName}
                        </p>
                        <p className="text-xs font-bold text-emerald-700">
                          {activeBooking.estimatedQuantityQtl} Quintals Verified Load
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Scheduled Slot Time & Dynamic Window Card */}
                  <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-2.5 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                        Scheduled Slot Window (Live Dynamic)
                      </p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl sm:text-2xl font-black text-gray-900 font-heading">
                          🕐 {formatApproxTimeRange12h(activeBooking.scheduledSlotStart, activeBooking.scheduledSlotEnd)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                        <span className="font-bold text-gray-700">📅 {activeBooking.scheduledDate || activeBooking.bookedDate || "Today"}</span>
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          ±5-10 min buffer
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-emerald-200/50 text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5">
                      <span>✓</span>
                      <span>
                        {activeBooking.tokenNumber.startsWith("M")
                          ? "Morning Session Dedicated Slot (Fast-Track Bay)"
                          : "Afternoon Session Dedicated Slot (Fast-Track Bay)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Center Telemetry Ribbon */}
                <div className="rounded-2xl p-4 bg-gradient-to-r from-[#0d4f3c] to-[#073628] text-white border border-emerald-600/30 shadow-md flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3.5 w-3.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80" />
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-400 shadow-sm" />
                    </span>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200">
                        Live Center Queue
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm sm:text-base font-black text-amber-300 font-heading">
                          {servingTokenShort} now serving
                        </span>
                        <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full font-extrabold text-emerald-100 border border-white/20">
                          Bay {servingBay} • {servingTokenShort.startsWith("M") ? "Morning" : "Afternoon"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200">
                      Live Dynamic Wait
                    </p>
                    <p className="text-sm sm:text-base font-black text-white font-heading mt-0.5">
                      {to12Hour(dynamicEta)} estimated arrival
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 border border-white/20 text-xs font-extrabold text-emerald-100">
                    <span>👥</span>
                    <span>{farmersAhead === 0 ? "You are next in line" : `${farmersAhead} vehicles ahead`}</span>
                  </div>
                </div>

                {/* High-Touch Action CTA */}
                <Link
                  href={`/farmer/queue?bookingId=${activeBooking.id}&centreId=${activeBooking.centerId}`}
                  className="btn-touch w-full py-4 bg-[#0d4f3c] hover:bg-[#12684f] active:bg-[#08382b] text-white text-sm font-extrabold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 group border border-emerald-500/30"
                >
                  <span>Track live queue & gate entry</span>
                  <span className="text-amber-300 text-lg font-black transition-transform group-hover:translate-x-1.5">→</span>
                </Link>
              </div>
            </div>
          );
        })() : completedBookings[0]?.procurementBill ? (
          /* Real-time Celebratory State When Load Has Been Weighed & Completed */
          <div className="space-y-3.5">
            <div className="rounded-3xl bg-gradient-to-r from-[#0a382b] via-[#0d4f3c] to-[#082e23] text-white p-6 sm:p-7 shadow-2xl border border-emerald-400/30 space-y-4 relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 text-emerald-300 px-3 py-1 text-xs font-black tracking-wider uppercase border border-emerald-400/30 shadow-xs">
                  <span>✅</span> Procurement Weighment Completed
                </span>
                <span className="text-xs text-amber-300 font-mono font-black tracking-wide bg-black/20 px-2.5 py-1 rounded-lg border border-white/10">
                  {completedBookings[0].procurementBill.billNumber}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white/10 rounded-2xl p-4 border border-white/10 space-y-0.5">
                  <p className="text-xs text-emerald-200 font-bold uppercase tracking-wider">Net Load Weighed</p>
                  <p className="text-2xl font-black text-white font-heading">
                    {completedBookings[0].procurementBill.netWeightQtl || completedBookings[0].estimatedQuantityQtl} Quintals
                  </p>
                  <p className="text-xs text-emerald-300 font-semibold">{completedBookings[0].cropName} • FAQ Standard Grade</p>
                </div>

                <div className="bg-white/10 rounded-2xl p-4 border border-white/10 space-y-0.5">
                  <p className="text-xs text-amber-300 font-bold uppercase tracking-wider">MSP Settlement Payable</p>
                  <p className="text-2xl font-black text-amber-300 font-heading">
                    ₹{(completedBookings[0].procurementBill?.netAmountPayable || completedBookings[0].procurementBill?.totalPayout || 0).toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-amber-200/90 font-semibold">
                    ₹{completedBookings[0].procurementBill.notifiedMspRate || 2275}/Qtl Official MSP
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-emerald-200/90 font-mono truncate max-w-xs">
                  PFMS Ref: {completedBookings[0].procurementBill.dbtPayment?.pfmsReferenceNumber || "Direct Benefit Transfer Processing"}
                </p>
                <Link
                  href="/farmer/payments"
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-zinc-950 font-black text-xs shadow-md transition-all inline-flex items-center gap-1.5"
                >
                  <span>View Digital J-Form & Payment</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl bg-white/90 p-4 border border-emerald-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-gray-900">Need to deliver another produce load?</p>
                <p className="text-[11px] text-gray-500 font-semibold">Book your guaranteed mandi arrival slot with dynamic queue pass.</p>
              </div>
              <Link
                href="/farmer/book"
                className="px-4 py-2 rounded-xl bg-[#0d4f3c] hover:bg-[#12684f] text-white font-black text-xs shadow-xs transition-all active:scale-95"
              >
                + Book Next Slot
              </Link>
            </div>
          </div>
        ) : (
          /* Clean Empty State when No Booking is Active */
          <div className="rounded-3xl bg-white/95 backdrop-blur-md border border-emerald-200/80 shadow-md p-6 sm:p-8 text-center space-y-4">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-3xl shadow-xs">
              🌾
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="text-lg sm:text-xl font-black text-gray-900 font-heading">
                No Active Mandi Delivery Scheduled
              </h4>
              <p className="text-xs sm:text-sm text-gray-600">
                Book your guaranteed APMC delivery window in advance to avoid mandi queues, get sequential gate token, and track live weighbridge call-outs.
              </p>
            </div>
            <Link
              href="/farmer/book"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#0d4f3c] hover:bg-[#12684f] active:bg-[#08382b] text-white font-black text-sm shadow-md transition-all group"
            >
              <span>📅 Book Mandi Delivery Slot</span>
              <span className="text-amber-300 font-black transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        )}
      </div>

      {/* 4. Section: At A Glance (This Week Stats) */}
      <div className="space-y-2.5">
        <div className="px-1 text-white">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200">
            {t("atAGlance")}
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
              <p className="font-bold text-gray-900 mt-0.5">{farmer.landRecords[0].sownAreaAcres} {t("acres")}</p>
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

      {/* Personalized Confirmation Modals */}

      {confirmCancelBookingId && (
        <ConfirmationModal
          isOpen={!!confirmCancelBookingId}
          title="Cancel Mandi Delivery Slot?"
          message={`Are you sure you want to cancel your delivery slot? Your allocated window will be released to subsequent waiting farmers.`}
          confirmLabel="Yes, Cancel Slot"
          cancelLabel="Keep My Slot"
          variant="danger"
          onConfirm={async () => {
            const id = confirmCancelBookingId;
            setConfirmCancelBookingId(null);
            await handleCancelBooking(id);
          }}
          onCancel={() => setConfirmCancelBookingId(null)}
        />
      )}

      {confirmRescheduleBooking && (
        <ConfirmationModal
          isOpen={!!confirmRescheduleBooking}
          title="Reschedule Mandi Delivery Slot?"
          message={`Rescheduling will release your current token (${confirmRescheduleBooking.tokenNumber}) and guide you to select a new session date and time.`}
          confirmLabel="Proceed to Reschedule"
          cancelLabel="Keep Current Slot"
          variant="warning"
          onConfirm={() => {
            const b = confirmRescheduleBooking;
            setConfirmRescheduleBooking(null);
            router.push(
              `/farmer/book?rescheduleBookingId=${b.id}&cropName=${encodeURIComponent(
                b.cropName
              )}&packageCount=${b.packageCount || 10}&unitType=${
                b.unitType || "GUNNY_BAG_50KG"
              }&centreId=${b.centerId}`
            );
          }}
          onCancel={() => setConfirmRescheduleBooking(null)}
        />
      )}
    </div>
  );
}
