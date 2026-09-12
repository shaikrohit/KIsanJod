"use client";

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
        <p className="text-sm font-semibold">{t("loadingPayments")}</p>
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
          {t("pfmsDbt")}
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
                {t("dbtMilestones")}
              </p>
              <div className="flex items-center gap-2 px-1">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shadow">
                    ✓
                  </div>
                  <p className="text-[10px] font-bold text-gray-700 mt-1">
                    {t("jFormBill")}
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
                    {t("bankCredit")}
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
