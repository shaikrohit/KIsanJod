// KisanJod - Queue API: Live queue state for a centre
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ centreId: string }> }
) {
  try {
    const { centreId } = await params;
    
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const targetDate = dateParam || new Date().toISOString().split("T")[0];

    const bookings = await db.booking.findMany({
      where: { centerId: centreId, bookedDate: targetDate },
      include: { farmer: { select: { fullName: true, maskedAadhaar: true } } },
      orderBy: { tokenNumber: "asc" },
    });

    const currentlyServing = bookings.find((b) => b.status === "AT_BAY" || b.status === "CALLED");
    const waiting = bookings.filter((b) => b.status === "WAITING");
    const completed = bookings.filter((b) => b.status === "COMPLETED");
    const standby = bookings.filter((b) => b.status === "STANDBY");

    return NextResponse.json({
      centreId,
      date: targetDate,
      currentlyServing: currentlyServing
        ? {
            id: currentlyServing.id,
            tokenNumber: currentlyServing.tokenNumber,
            farmerName: currentlyServing.farmer.fullName,
            cropName: currentlyServing.cropName,
            status: currentlyServing.status,
            sessionName: currentlyServing.sessionName,
          }
        : null,
      waitingQueue: waiting.map((b) => ({
        id: b.id,
        tokenNumber: b.tokenNumber,
        farmerName: b.farmer.fullName,
        cropName: b.cropName,
        packageCount: b.packageCount,
        estimatedQtl: b.estimatedQuantityQtl,
        scheduledSlot: `${b.scheduledSlotStart} - ${b.scheduledSlotEnd}`,
        dynamicEta: b.dynamicEta,
        delayMinutes: b.delayMinutes,
      })),
      standbyQueue: standby.map((b) => ({
        id: b.id,
        tokenNumber: b.tokenNumber,
        farmerName: b.farmer.fullName,
      })),
      completedCount: completed.length,
      totalBooked: bookings.length,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
