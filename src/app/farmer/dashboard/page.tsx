"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { to12Hour, formatApproxTimeRange12h } from "@/lib/timeFormat";
import { ConfirmationModal } from "@/components/ConfirmationModal";

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
  packageCount?: number;
  unitType?: string;
  bayAssigned?: number | null;
  sessionName?: string;
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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

  // Poll live queue telemetry if farmer has an active booking
  const activeBooking = bookings.find((b) =>
    ["WAITING", "CALLED", "AT_BAY", "STANDBY"].includes(b.status)
  );

  useEffect(() => {
    if (!activeBooking?.centerId) return;

    const fetchQueue = () => {
      fetch(`/api/queue/${activeBooking.centerId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d && !d.error) setLiveQueue(d);
        })
        .catch(() => {});
    };

    fetchQueue();
    const interval = setInterval(fetchQueue, 4000);
    return () => clearInterval(interval);
  }, [activeBooking?.centerId]);

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
            {t("welcome")}, {farmer.fullName.split(" ")[0]} <span>👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/80 mt-0.5">
            {t("heroSubtitle")}
          </p>
        </div>
      </div>

      {/* 1. Hero Card (Matching Reference Image) */}
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

      {/* 3. Section: Your Next Visit / Active Booking (World-Class Generative UI APMC Boarding Pass) */}
      {activeBooking && (() => {
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
          <div className="space-y-3">
            <div className="flex items-center justify-between text-white px-1">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 shadow-sm" />
                </span>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200">
                    {t("yourNextVisit") || "YOUR NEXT VISIT"}
                  </p>
                  <h3 className="text-xl font-extrabold font-heading text-white tracking-tight">
                    {t("activeBooking") || "Active booking"}
                  </h3>
                </div>
              </div>
              <Link
                href={`/farmer/queue?bookingId=${activeBooking.id}&centreId=${activeBooking.centerId}`}
                className="text-xs text-amber-300 hover:text-amber-200 font-extrabold flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-full border border-white/20 backdrop-blur-sm transition-all shadow-sm group"
              >
                <span>{t("viewDetails") || "View details"}</span>
                <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
              </Link>
            </div>

            {/* Generative UI APMC Digital Boarding Pass */}
            <div className="relative overflow-hidden rounded-3xl bg-white/95 backdrop-blur-md border border-emerald-200/80 shadow-[0_22px_50px_rgba(10,50,35,0.20)] transition-all">
              {/* Top APMC Security Ribbon */}
              <div className="h-2 w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-400" />

              <div className="p-5 sm:p-7 space-y-5">
                {/* Status Bar & Action Row */}
                <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-100">
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

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmRescheduleBooking(activeBooking)}
                      className="px-3 py-1.5 rounded-full text-xs font-black text-zinc-900 bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-colors shadow-sm"
                    >
                      🗓️ Reschedule
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmCancelBookingId(activeBooking.id)}
                      className="px-3 py-1.5 rounded-full text-xs font-black text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors shadow-sm"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                </div>

                {/* Primary Ticket Block with Token Notch */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 p-5 rounded-2xl border border-emerald-100 shadow-sm">
                  {/* Token Box */}
                  <div className="sm:col-span-6 flex items-center gap-4">
                    <div className="flex h-18 w-18 sm:h-20 sm:w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg border-2 border-emerald-500">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-300">BAY {activeBooking.bayAssigned || 1}</span>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-300">
                        {activeBooking.tokenNumber.startsWith("M") ? "MORNING" : "AFTERNOON"}
                      </span>
                      <span className="text-xl sm:text-2xl font-black font-heading leading-tight tracking-tight text-white">
                        {activeBooking.tokenNumber}
                      </span>
                      <span className="text-[9px] font-bold text-gray-300">PASS</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                        Assigned Gate Token
                      </p>
                      <h4 className="text-2xl sm:text-3xl font-black text-gray-900 font-heading tracking-tight">
                        {activeBooking.tokenNumber}
                      </h4>
                      <p className="text-xs font-bold text-emerald-700 mt-0.5">
                        Bay {activeBooking.bayAssigned || 1} Dedicated Fast-Track
                        {activeBooking.tokenNumber.startsWith("M") ? "🌅 Morning Session Dedicated Slot" : "☀️ Afternoon Session Dedicated Slot"}
                      </p>
                    </div>
                  </div>

                  {/* Scheduled Window */}
                  <div className="sm:col-span-6 flex flex-col justify-center sm:border-l sm:border-emerald-100 sm:pl-5">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                      Scheduled Slot Window (Live Dynamic)
                    </p>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-xl sm:text-2xl font-black text-gray-900 font-heading">
                        🕐 {formatApproxTimeRange12h(activeBooking.scheduledSlotStart, activeBooking.scheduledSlotEnd)}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-gray-500 mt-1 flex items-center gap-2">
                      <span>📅 {activeBooking.bookedDate}</span>
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        ±5-10 min buffer
                      </span>
                    </p>
                  </div>
                </div>

                {/* Mandi Facility & Commodity Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Mandi Yard */}
                  <div className="flex items-center gap-3 p-3.5 bg-gray-50/90 rounded-2xl border border-gray-200/80">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm border border-gray-200">
                      🏢
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                        Procurement Centre
                      </p>
                      <p className="text-sm font-extrabold text-gray-900 truncate">
                        {activeBooking.center.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {activeBooking.center.district || "APMC Regulated Mandi"}
                      </p>
                    </div>
                  </div>

                  {/* Commodity & Metric Load */}
                  <div className="flex items-center gap-3 p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-100">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm border border-emerald-200">
                      🌾
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                        Commodity & Load
                      </p>
                      <p className="text-sm font-extrabold text-emerald-950 truncate">
                        {activeBooking.cropName}
                      </p>
                      <p className="text-xs font-bold text-emerald-800">
                        {activeBooking.estimatedQuantityQtl} Quintals Verified Load
                      </p>
                    </div>
                  </div>
                </div>

                {/* Live Queue Telemetry Ribbon (Requirement 2) */}
                <div className="rounded-2xl p-4 bg-gradient-to-r from-[#0d4f3c] to-[#073628] text-white border border-emerald-600/30 shadow-md flex flex-wrap items-center justify-between gap-3">
                  {/* Currently Serving */}
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
                          Bay {servingBay}
                          {servingTokenShort.startsWith("M") ? "Morning" : "Afternoon"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Estimated Wait */}
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200">
                      Live Dynamic Wait
                    </p>
                    <p className="text-sm sm:text-base font-black text-white font-heading mt-0.5">
                      {to12Hour(dynamicEta)} estimated arrival
                    </p>
                  </div>

                  {/* Farmers Ahead Badge */}
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
                  <span>Track live queue</span>
                  <span className="text-amber-300 text-lg font-black transition-transform group-hover:translate-x-1.5">→</span>
                </Link>
              </div>
            </div>
          </div>
        );
      })()}

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
      {showLogoutConfirm && (
        <ConfirmationModal
          isOpen={showLogoutConfirm}
          title="Sign Out from KisanJod?"
          message={`Are you sure you want to sign out, ${farmer?.fullName || "Farmer"}? You will need to enter your registered Aadhaar to sign back in.`}
          confirmLabel="Yes, Sign Out"
          cancelLabel="Stay Logged In"
          variant="danger"
          onConfirm={() => {
            setShowLogoutConfirm(false);
            try {
              localStorage.removeItem("kisanjod_farmer");
              localStorage.removeItem("kisanjod_operator");
              localStorage.removeItem("kisanjod_admin");
              sessionStorage.removeItem("kisanjod_admin");
            } catch {}
            window.dispatchEvent(new Event("kisanjod_auth_change"));
            router.push("/login");
          }}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}

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
