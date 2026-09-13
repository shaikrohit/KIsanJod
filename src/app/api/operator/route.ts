// KisanJod - Operator API: Advance queue, process, standby
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agmarknetMock } from "@/lib/mocks/agmarknet";
import { timeToMinutes, minutesToTimeStr } from "@/lib/timeFormat";
import { notifySync } from "@/lib/syncBus";
import crypto from "crypto";

// POST /api/operator/advance - Call next token
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, centerId, bookingId, operatorId, gradeData } = body;

    if (action === "call_next") {
      // Find next waiting token
      const today = new Date().toISOString().split("T")[0];
      const nextWaiting = await db.booking.findFirst({
        where: { centerId, bookedDate: today, status: "WAITING" },
        orderBy: { tokenNumber: "asc" },
      });

      if (!nextWaiting) {
        return NextResponse.json({ error: "No farmers waiting in queue" }, { status: 404 });
      }

      const updated = await db.booking.update({
        where: { id: nextWaiting.id },
        data: {
          status: "CALLED",
          queueEvents: {
            create: {
              eventType: "CALLED_FOR_PROCESSING",
              description: `Token ${nextWaiting.tokenNumber} called for procurement weighment`,
              triggeredBy: "OPERATOR",
            },
          },
        },
      });

      notifySync({
        type: "QUEUE_CALL",
        centerId,
        tokenNumber: updated.tokenNumber,
        farmerId: updated.farmerId,
        bookingId: updated.id,
      });

      return NextResponse.json({ success: true, token: updated.tokenNumber, status: "CALLED" });
    }

    if (action === "standby") {
      if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

      const updated = await db.booking.update({
        where: { id: bookingId },
        data: {
          status: "STANDBY",
          queueEvents: {
            create: {
              eventType: "STANDBY_MARKED",
              description: "Farmer did not arrive within grace period. Token on standby.",
              triggeredBy: "OPERATOR",
            },
          },
        },
      });

      notifySync({
        type: "QUEUE_STANDBY",
        bookingId,
        centerId: updated.centerId,
        farmerId: updated.farmerId,
        tokenNumber: updated.tokenNumber,
      });

      return NextResponse.json({ success: true, status: "STANDBY" });
    }

    if (action === "cancel") {
      if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

      const updated = await db.booking.update({
        where: { id: bookingId },
        data: {
          status: "CANCELLED",
          queueEvents: {
            create: {
              eventType: "CANCELLED",
              description: "Booking cancelled",
              triggeredBy: "USER",
            },
          },
        },
      });

      notifySync({
        type: "QUEUE_CANCEL",
        bookingId,
        centerId: updated.centerId,
        farmerId: updated.farmerId,
        tokenNumber: updated.tokenNumber,
      });

      return NextResponse.json({ success: true, status: "CANCELLED" });
    }

    if (action === "complete") {
      if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

      const booking = await db.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      await db.booking.update({
        where: { id: bookingId },
        data: {
          status: "COMPLETED",
          queueEvents: {
            create: {
              eventType: "COMPLETED",
              description: `Procurement processing completed for ${booking.tokenNumber}`,
              triggeredBy: "OPERATOR",
            },
          },
        },
      });

      // Auto-advance downstream waiting tokens in this session
      const downstreamWaiting = await db.booking.findMany({
        where: {
          centerId: booking.centerId,
          bookedDate: booking.bookedDate,
          sessionName: booking.sessionName,
          status: "WAITING",
        },
        orderBy: { scheduledSlotStart: "asc" },
      });

      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const nowMin = currentHour * 60 + currentMin;

      const scheduledEndMin = timeToMinutes(booking.scheduledSlotEnd);
      if (nowMin < scheduledEndMin && downstreamWaiting.length > 0) {
        const savedMinutes = Math.min(30, scheduledEndMin - nowMin);
        for (const downstream of downstreamWaiting) {
          const curEtaMin = timeToMinutes(downstream.dynamicEta || downstream.scheduledSlotStart);
          const newEtaMin = Math.max(nowMin, curEtaMin - savedMinutes);
          const newEtaStr = minutesToTimeStr(newEtaMin);

          await db.booking.update({
            where: { id: downstream.id },
            data: {
              dynamicEta: newEtaStr,
              queueEvents: {
                create: {
                  eventType: "QUEUE_AUTO_ADVANCED",
                  description: `Token ${booking.tokenNumber} completed early. Arrival window moved up by ~${savedMinutes}m to ~${newEtaStr}.`,
                  triggeredBy: "SYSTEM",
                },
              },
            },
          });
        }
      }

      notifySync({
        type: "QUEUE_COMPLETED",
        bookingId,
        centerId: booking.centerId,
        farmerId: booking.farmerId,
        tokenNumber: booking.tokenNumber,
      });

      return NextResponse.json({ success: true, status: "COMPLETED" });
    }

    if (action === "process") {
      if (!bookingId || !operatorId || !gradeData) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const { qualityGrade, moisturePct, grossWeightQtl, tareWeightQtl } = gradeData;
      const netWeightQtl = parseFloat((grossWeightQtl - tareWeightQtl).toFixed(2));
      if (netWeightQtl <= 0) {
        return NextResponse.json({ error: "Gross weight must be strictly greater than tare weight." }, { status: 400 });
      }

      const booking = await db.booking.findUnique({
        where: { id: bookingId },
        include: { farmer: { include: { bankAccounts: true } } },
      });

      if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

      const payout = agmarknetMock.calculatePayout(booking.cropName, netWeightQtl, qualityGrade);
      const billNumber = `JF-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`;
      const digitalSealHash = crypto.createHash("sha256").update(billNumber + netWeightQtl).digest("hex");

      // Resolve operator by id or employeeId to satisfy foreign key constraint
      const op = await db.operator.findFirst({
        where: {
          OR: [{ id: operatorId }, { employeeId: operatorId }],
        },
      });
      const resolvedOperatorId = op?.id || (await db.operator.findFirst())?.id || operatorId;

      // Create bill
      const bill = await db.procurementBill.create({
        data: {
          billNumber,
          bookingId,
          centerId: booking.centerId,
          operatorId: resolvedOperatorId,
          farmerId: booking.farmerId,
          cropName: booking.cropName,
          qualityGrade,
          measuredMoisturePct: moisturePct,
          grossWeightQtl,
          tareWeightQtl,
          netWeightQtl,
          notifiedMspRate: payout.mspRate,
          grossAmountPayable: payout.grossAmount,
          deductionsAmount: 0,
          netAmountPayable: payout.netPayable,
          digitalSealHash,
          qrPayload: `https://doca.gov.in/verify/${billNumber}`,
        },
      });

      // Create DBT payment record
      const pfmsRef = `PFMS-${new Date().getFullYear()}-DOCA-${String(Date.now()).slice(-8)}`;
      const bankAccount = booking.farmer.bankAccounts[0];

      await db.dbtPayment.create({
        data: {
          billId: bill.id,
          pfmsReferenceNumber: pfmsRef,
          status: "PROCESSING",
          beneficiaryMaskedAc: bankAccount?.accountNumberMasked || "XXXXXX0000",
          bankIfsc: bankAccount?.ifscCode || "SBIN0000001",
          bankName: bankAccount?.bankName || "State Bank of India",
          amountInr: payout.netPayable,
        },
      });

      // Mark booking completed
      await db.booking.update({
        where: { id: bookingId },
        data: {
          status: "COMPLETED",
          queueEvents: {
            create: {
              eventType: "COMPLETED",
              description: `Weighment completed: Net ${netWeightQtl} Qtl, Grade ${qualityGrade}. Bill ${billNumber}`,
              triggeredBy: "OPERATOR",
            },
          },
        },
      });

      notifySync({
        type: "WEIGHMENT_COMPLETED",
        bookingId,
        centerId: booking.centerId,
        farmerId: booking.farmerId,
        tokenNumber: booking.tokenNumber,
        billNumber,
        netWeightQtl,
        mspRate: payout.mspRate,
        netPayable: payout.netPayable,
        pfmsRef,
      });

      return NextResponse.json({
        success: true,
        bill: {
          billNumber,
          netWeightQtl,
          mspRate: payout.mspRate,
          netPayable: payout.netPayable,
          pfmsRef,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Operator error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
