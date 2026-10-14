// KisanJod - Operator API: Advance queue, process, standby (100% Standalone Self-Contained)
import { NextRequest, NextResponse } from "next/server";
import { standaloneStore } from "@/lib/standaloneStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, centerId, bookingId, operatorId, gradeData, date } = body;

    if (action === "call_next") {
      const res = standaloneStore.callNext(centerId, date);
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: res.status });
      }
      return NextResponse.json({ success: true, token: res.token, status: "CALLED" });
    }

    if (action === "standby") {
      if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });
      const res = standaloneStore.putStandby(bookingId);
      if (!res.success) return NextResponse.json({ error: res.error }, { status: res.status });
      return NextResponse.json({ success: true, status: "STANDBY" });
    }

    if (action === "resume_standby" || action === "call_token") {
      if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });
      const res = standaloneStore.resumeStandby(bookingId);
      if (!res.success) return NextResponse.json({ error: res.error }, { status: res.status });
      return NextResponse.json({ success: true, token: res.booking?.tokenNumber, status: "CALLED" });
    }

    if (action === "cancel") {
      if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });
      const res = standaloneStore.cancelBooking(bookingId);
      if (!res.success) return NextResponse.json({ error: res.error }, { status: res.status });
      return NextResponse.json({ success: true, status: "CANCELLED" });
    }

    if (action === "process") {
      if (!bookingId || !operatorId || !gradeData) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const { qualityGrade, moisturePct, grossWeightQtl, tareWeightQtl } = gradeData;
      if (grossWeightQtl <= tareWeightQtl) {
        return NextResponse.json({ error: "Gross weight must be strictly greater than tare weight." }, { status: 400 });
      }

      const res = standaloneStore.completeWeighment({
        bookingId,
        grossWeightQtl,
        tareWeightQtl,
        grade: qualityGrade || "FAQ",
        moisture: moisturePct || 12.0,
        operatorId,
      });

      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: res.status });
      }

      return NextResponse.json({
        success: true,
        bill: {
          billNumber: res.bill?.billNumber,
          netWeightQtl: res.bill?.netWeightQtl,
          mspRate: res.bill?.notifiedMspRate,
          netPayable: res.bill?.netAmountPayable,
          pfmsRef: res.bill?.dbtPayment?.pfmsReferenceNumber,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Operator API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
