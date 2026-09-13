"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { to12Hour, formatApproxTimeRange12h } from "@/lib/timeFormat";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useInstantSync } from "@/lib/useInstantSync";

interface QueueResponse {
  centreId: string;
  date: string;
  currentlyServing: {
    tokenNumber: string;
    farmerName: string;
    cropName: string;
    status: string;
    bayAssigned: number;
    sessionName?: string;
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
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [myTokenNumber, setMyTokenNumber] = useState<string>("");
  const [myStatus, setMyStatus] = useState<string>("WAITING");
  const [scheduledSlot, setScheduledSlot] = useState<string>("");
  const [cropName, setCropName] = useState<string>("");
  const [completedBill, setCompletedBill] = useState<{
    billNumber: string;
    netWeightQtl: number;
    mspRate: number;
    netPayable: number;
    pfmsRef?: string;
  } | null>(null);

  const [activeCentreId, setActiveCentreId] = useState<string>(centreId || "center_lud_01");

  const fetchLiveQueue = useCallback(async (targetCentreId?: string) => {
    const cid = targetCentreId || activeCentreId || centreId || "center_lud_01";
    try {
      const res = await fetch(`/api/queue/${cid}`);
      if (res.ok) {
        const data: QueueResponse = await res.json();
        setQueueData(data);
      }
    } catch (e) {
      console.error("Queue fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [activeCentreId, centreId]);

  const fetchBookingDetails = useCallback(async () => {
    try {
      const stored = localStorage.getItem("kisanjod_farmer");
      if (!stored) {
        router.push("/login");
        return;
      }
      const farmer = JSON.parse(stored);
      const res = await fetch(`/api/bookings?farmerId=${farmer.id}`);
      if (!res.ok) return;
      const d = await res.json();
      const allBookings = d.bookings || [];
      const matching = bookingId
        ? allBookings.find((b: { id: string }) => b.id === bookingId)
        : allBookings.find((b: { status: string }) =>
            ["WAITING", "CALLED", "AT_BAY", "STANDBY"].includes(b.status)
          ) || allBookings[0];

      if (matching) {
        if (matching.centerId && matching.centerId !== activeCentreId) {
          setActiveCentreId(matching.centerId);
          fetchLiveQueue(matching.centerId);
        }
        setMyTokenNumber(matching.tokenNumber);
        setMyStatus(matching.status);
        setScheduledSlot(
          formatApproxTimeRange12h(matching.scheduledSlotStart, matching.scheduledSlotEnd)
        );
        setCropName(matching.cropName);
        if (matching.procurementBill) {
          setCompletedBill({
            billNumber: matching.procurementBill.billNumber,
            netWeightQtl: matching.procurementBill.netWeightQtl || matching.estimatedQuantityQtl,
            mspRate: matching.procurementBill.notifiedMspRate || 2275,
            netPayable: matching.procurementBill.netAmountPayable,
            pfmsRef: matching.procurementBill.dbtPayment?.pfmsReferenceNumber,
          });
        }
      }
    } catch (err) {
      console.error("Error fetching booking details:", err);
    } finally {
      setLoading(false);
    }
  }, [bookingId, router, activeCentreId, fetchLiveQueue]);

  // Zero-delay instant sync over SSE and BroadcastChannel
  useInstantSync(() => {
    fetchLiveQueue();
    fetchBookingDetails();
  });

  // Initial load and fast 1000ms backup heartbeat
  useEffect(() => {
    fetchBookingDetails();
    fetchLiveQueue();
    const timer = setInterval(() => {
      fetchBookingDetails();
      fetchLiveQueue();
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchLiveQueue, fetchBookingDetails]);

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
        <p className="font-semibold text-sm">{t("loadingQueue")}</p>
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
      {/* Header with back, live sync badge, and manual refresh */}
      <div className="flex items-center justify-between">
        <Link
          href="/farmer/dashboard"
          className="text-xs text-white font-bold flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-2 rounded-xl border border-white/20 transition-colors"
        >
          ← {t("navHome")}
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/70 border border-emerald-500/50 rounded-full text-[10px] font-black text-emerald-300 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Syncing</span>
          </div>
          <button
            type="button"
            onClick={() => fetchLiveQueue()}
            className="text-xs text-white/90 hover:text-white bg-white/10 hover:bg-white/25 border border-white/20 px-2.5 py-1 rounded-xl transition-all"
            title="Refresh Live Queue"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Next-in-Line Gate Readiness Alert (Decision 8) */}
      {farmersAhead === 0 && queueData?.currentlyServing && !isCalled && (
        <div className="bg-amber-400 text-zinc-950 rounded-2xl p-4 shadow-xl border-2 border-amber-600 flex items-center justify-between gap-3 animate-subtle-pulse">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-zinc-950 text-amber-300 px-2 py-0.5 rounded-full">
              🚜 GATE CALL • NEXT IN LINE
            </span>
            <p className="text-sm font-black mt-1">
              Vehicle {queueData.currentlyServing.tokenNumber} is completing unloading.
            </p>
            <p className="text-xs font-bold text-zinc-900 mt-0.5">
              Please line up your vehicle at the Mandi Unloading Gate now.
            </p>
          </div>
          <button
            onClick={() =>
              speakStatus(
                `Vehicle ${queueData.currentlyServing?.tokenNumber} is completing unloading. Please line up your vehicle at the unloading gate now.`
              )
            }
            className="px-3 py-2 bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs rounded-xl shrink-0 shadow"
          >
            🔊 Listen
          </button>
        </div>
      )}

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
                `${t("yourTokenNumber")} ${myTokenNumber}. ${t("turnCalledSpeech")}`
              )
            }
            className="mt-3 bg-white text-purple-900 font-bold px-4 py-2 rounded-xl text-xs shadow hover:bg-purple-50"
          >
            🔊 {t("tapToSpeak")}
          </button>
        </div>
      )}

      {/* 2. 10-Minute Turn Countdown Alert */}
      {isTurnNearing && !queueData?.currentlyServing && (
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-3xl p-5 shadow-xl text-center border border-amber-300">
          <p className="text-2xl mb-1">⚠️</p>
          <h3 className="text-lg font-black font-heading">
            {t("turnApproachingTitle")}
          </h3>
          <p className="text-xs text-amber-100 mt-1">
            {t("turnApproachingDesc")}
          </p>
          <button
            onClick={() => speakStatus(t("turnNearingSpeech"))}
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

      {/* 0. Real-time Weighment Completed & J-Form Generated Alert */}
      {(myStatus === "COMPLETED" || completedBill) && (
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white rounded-3xl p-6 shadow-2xl text-center border-2 border-emerald-400 space-y-4 animate-subtle-pulse">
          <div className="text-4xl">🎉</div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-white text-emerald-950 px-3 py-1 rounded-full">
              WEIGHMENT COMPLETED & J-FORM GENERATED
            </span>
            <h3 className="text-xl sm:text-2xl font-black font-heading mt-2">
              Procurement Successfully Finalized!
            </h3>
            <p className="text-xs text-emerald-200 mt-1">
              Token {myTokenNumber} weighbridge verification has been submitted by the Mandi operator.
            </p>
          </div>

          {completedBill && (
            <div className="bg-black/30 rounded-2xl p-4 text-xs text-left border border-white/10 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-300 font-semibold">Bill Number:</span>
                <span className="font-mono font-bold text-amber-300">{completedBill.billNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300 font-semibold">Net Weight Verified:</span>
                <span className="font-bold text-white">{completedBill.netWeightQtl} Quintals</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300 font-semibold">Total MSP Payable:</span>
                <span className="font-bold text-amber-300 font-heading text-sm">
                  ₹{completedBill.netPayable.toLocaleString("en-IN")}
                </span>
              </div>
              {completedBill.pfmsRef && (
                <div className="flex justify-between pt-1 border-t border-white/10 text-[11px]">
                  <span className="text-gray-400">PFMS Ref:</span>
                  <span className="font-mono text-emerald-300 truncate max-w-[200px]">{completedBill.pfmsRef}</span>
                </div>
              )}
            </div>
          )}

          <Link
            href="/farmer/payments"
            className="btn-touch w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs rounded-xl shadow-lg transition-all inline-flex items-center justify-center gap-2"
          >
            <span>View Digital J-Form & DBT Payment Status</span>
            <span>→</span>
          </Link>
        </div>
      )}

      {/* Main Token Hero Card */}
      <div className="bg-[#072a1e] text-white rounded-3xl p-6 shadow-2xl text-center relative overflow-hidden border border-white/10">
        <div className="flex items-center justify-between text-xs text-emerald-200 mb-2">
          <span className="font-bold">{cropName || t("crop")}</span>
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

        <p className="text-xs uppercase tracking-widest text-emerald-300 font-extrabold">
          {t("yourTokenNumber")}
        </p>
        <p className="text-4xl sm:text-5xl font-black tracking-tight my-2 text-white font-heading">
          {myTokenNumber || "B1-001"}
        </p>

        {/* Live Ripple ETA Display */}
        <div className="mt-4 bg-emerald-950/70 rounded-2xl p-3 border border-emerald-800/80 flex items-center justify-around text-left">
          <div>
            <p className="text-[11px] text-emerald-300 font-bold">{t("scheduledTime")}</p>
            <p className="text-sm font-black text-white">
              {scheduledSlot || "~9:00 AM – ~9:30 AM"}
            </p>
          </div>
          <div className="h-8 w-px bg-emerald-800" />
          <div>
            <p className="text-[11px] text-amber-300 flex items-center gap-1 font-bold">
              {t("liveRippleEta")}
              {totalDelayMinutes > 0 && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-black">
                  +{totalDelayMinutes}m
                </span>
              )}
            </p>
            <p className="text-base font-extrabold text-amber-400 font-heading">
              ~{to12Hour(liveEta)}
            </p>
          </div>
        </div>

        {/* Action buttons: Cancel & Reschedule */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              router.push(`/farmer/book?rescheduleBookingId=${bookingId || ""}&centreId=${centreId || ""}`);
            }}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-colors shadow-sm"
          >
            🗓️ Reschedule
          </button>
          <button
            type="button"
            onClick={() => setShowCancelConfirm(true)}
            className="px-4 py-2 bg-red-950/60 hover:bg-red-900/80 text-red-200 text-xs font-bold rounded-xl border border-red-500/40 transition-colors shadow-sm"
          >
            ✕ Cancel
          </button>
        </div>
      </div>

      <section className="government-panel p-5" aria-labelledby="queue-status-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{t("yourQueueStatus")}</p>
            <h2 id="queue-status-title" className="mt-1 text-xl font-extrabold text-[#17382d] font-heading">
              {isCalled ? "Called for Processing" : isStandby ? t("standby") : t("waitingForCall")}
            </h2>
          </div>
          <span className="status-dot" aria-hidden="true" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#dbe6df] pt-4 text-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#6a7f79]">{t("yourTokenNumber")}</p>
            <p className="mt-1 text-lg font-extrabold text-[#176b4b]">{myTokenNumber || "TK-002"}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#6a7f79]">{t("farmersAhead")}</p>
            <p className="mt-1 text-lg font-extrabold text-[#176b4b]">{farmersAhead}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#6a7f79]">{t("estimatedWait")}</p>
            <p className="mt-1 text-lg font-extrabold text-[#176b4b]">{farmersAhead * 15} {t("minutes")}</p>
          </div>
        </div>
        {queueData?.currentlyServing && (
          <p className="mt-4 rounded-xl bg-[#f4f8f5] px-3 py-2 text-xs font-semibold text-[#315449]">
            {t("currentlyServingToken")}: {queueData.currentlyServing.tokenNumber} · {queueData.currentlyServing.sessionName === "AFTERNOON" ? "Afternoon Session" : "Morning Session"}
          </p>
        )}
      </section>

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
              {t("noWaitingTokens")}
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
                        {item.tokenNumber} {isMe && `(${t("you")})`}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {item.cropName} • {item.estimatedQtl} Qtl
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-800">
                      {to12Hour(item.dynamicEta)}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {item.scheduledSlot.includes("-")
                        ? formatApproxTimeRange12h(
                            item.scheduledSlot.split("-")[0].trim(),
                            item.scheduledSlot.split("-")[1].trim()
                          )
                        : to12Hour(item.scheduledSlot)}
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

      {showCancelConfirm && (
        <ConfirmationModal
          isOpen={showCancelConfirm}
          title="Cancel Delivery Booking?"
          message="Are you sure you want to cancel your delivery slot? Your allocated window will be released to subsequent waiting farmers."
          confirmLabel="Yes, Cancel Slot"
          cancelLabel="Keep My Slot"
          variant="danger"
          onConfirm={async () => {
            setShowCancelConfirm(false);
            if (!bookingId) return;
            const res = await fetch("/api/bookings", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "cancel", bookingId }),
            });
            const data = await res.json();
            if (data.success) router.push("/farmer/dashboard");
          }}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}
    </div>
  );
}

export default function FarmerQueuePage() {
  const { t } = useLanguage();

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] text-white text-sm">
          {t("loadingQueue")}
        </div>
      }
    >
      <QueueContent />
    </Suspense>
  );
}
