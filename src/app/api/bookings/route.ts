// KisanJod - Bookings API: Create continuous dynamic slot booking
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CROP_CATALOG } from "@/lib/mocks/agmarknet";
import { calculateHandlingDuration, addMinutesToTimeString } from "@/lib/handlingDuration";
import { timeToMinutes, minutesToTimeStr } from "@/lib/timeFormat";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      farmerId,
      centerId,
      cropName,
      packageCount,
      capacityKg,
      date,
      hourOfDay,
      startTime,
      endTime,
      bayAssigned,
      sessionName,
      unitType,
      rescheduleBookingId,
    } = body;

    if (!farmerId || !centerId || !cropName || !packageCount || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Security & Data Integrity Validation
    const parsedPkgCount = parseInt(String(packageCount), 10);
    if (isNaN(parsedPkgCount) || parsedPkgCount < 1 || parsedPkgCount > 5000) {
      return NextResponse.json(
        { error: "Invalid package count: must be an integer between 1 and 5,000." },
        { status: 400 }
      );
    }

    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format: expected YYYY-MM-DD." },
        { status: 400 }
      );
    }

    // Find crop info
    const crop = CROP_CATALOG.find(
      (c) => c.nameEn.toLowerCase() === cropName.toLowerCase() || c.commodityKey.toLowerCase() === cropName.toLowerCase()
    );
    if (!crop) {
      return NextResponse.json({ error: "Invalid crop selected" }, { status: 400 });
    }

    // Determine package unit type and kg
    const resolvedUnitType = (unitType || crop.standardPackaging) as "GUNNY_BAG_50KG" | "CRATE_25KG" | "QUINTALS";
    const requestedCapacity = Number(capacityKg);
    const kgPerPkg = Number.isFinite(requestedCapacity) && requestedCapacity > 0
      ? requestedCapacity
      : crop.kgPerPackage;

    const estimatedQtl = parseFloat(((packageCount * kgPerPkg) / 100).toFixed(2));

    // Fetch centre active palledar workers
    const center = await db.procurementCenter.findUnique({
      where: { id: centerId },
      select: { activeWorkers: true },
    });
    const activeWorkers = center?.activeWorkers || 4;

    // Calculate handling duration using empirical mandi labor model
    const handling = calculateHandlingDuration({
      packageCount: Number(packageCount),
      unitType: resolvedUnitType,
      capacityKg: kgPerPkg,
      activeWorkers,
    });
    const totalMinutes = handling.totalDurationMinutes;

    // Determine scheduled start & end time
    let scheduledStart: string;
    let scheduledEnd: string;
    let startHour: number;

    if (startTime && typeof startTime === "string" && startTime.includes(":")) {
      scheduledStart = startTime;
      startHour = parseInt(scheduledStart.split(":")[0], 10);
      scheduledEnd = endTime && typeof endTime === "string"
        ? endTime
        : addMinutesToTimeString(scheduledStart, totalMinutes);
    } else {
      startHour = hourOfDay !== undefined ? Number(hourOfDay) : 9;
      scheduledStart = `${String(startHour).padStart(2, "0")}:00`;
      scheduledEnd = addMinutesToTimeString(scheduledStart, totalMinutes);
    }

    // Ensure slot capacity tracking record exists
    let slot = await db.hourlySlotCapacity.findFirst({
      where: { centerId, date, hourOfDay: startHour },
    });

    if (!slot) {
      slot = await db.hourlySlotCapacity.create({
        data: {
          centerId,
          date,
          hourOfDay: startHour,
          maxCapacity: 10,
          bookedCount: 0,
        },
      });
    }

    // Determine session name and sequential session token (e.g. M-001, A-001)
    const sessionNameResolved = sessionName || (startHour < 14 ? "MORNING" : "AFTERNOON");
    const prefix = sessionNameResolved === "MORNING" ? "M" : "A";
    const existingSessionBookings = await db.booking.count({
      where: { centerId, bookedDate: date, sessionName: sessionNameResolved },
    });
    const seqNum = existingSessionBookings + 1;
    const tokenNumber = `${prefix}-${String(seqNum).padStart(3, "0")}`;

    // Create booking
    const bookingNumber = `BK-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const booking = await db.booking.create({
      data: {
        bookingNumber,
        tokenNumber,
        farmerId,
        centerId,
        cropName: crop.nameEn,
        commodityCategory: crop.category,
        unitType: resolvedUnitType,
        packageCount: Number(packageCount),
        estimatedQuantityQtl: estimatedQtl,
        bookedDate: date,
        scheduledSlotStart: scheduledStart,
        scheduledSlotEnd: scheduledEnd,
        dynamicEta: scheduledStart,
        delayMinutes: 0,
        status: "WAITING",
        sessionName: sessionNameResolved,
        queueEvents: {
          create: {
            eventType: "SLOT_CONFIRMED",
            description: `Dynamic slot booked for ${estimatedQtl} Qtl ${crop.nameEn} (${packageCount} ${handling.unitLabelEn}). Handling ~${totalMinutes} min. Token ${tokenNumber}`,
            triggeredBy: "SYSTEM",
          },
        },
      },
    });

    // Update slot capacity
    await db.hourlySlotCapacity.update({
      where: { id: slot.id },
      data: { bookedCount: slot.bookedCount + 1 },
    });

    if (rescheduleBookingId) {
      try {
        await db.booking.update({
          where: { id: rescheduleBookingId },
          data: {
            status: "CANCELLED",
            queueEvents: {
              create: {
                eventType: "CANCELLED",
                description: `Farmer rescheduled this slot. Replaced by token ${booking.tokenNumber}`,
                triggeredBy: "FARMER",
              },
            },
          },
        });
      } catch (e) {
        console.error("Error auto-cancelling rescheduled booking:", e);
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        tokenNumber: booking.tokenNumber,
        cropName: booking.cropName,
        packageCount: booking.packageCount,
        unitType: booking.unitType,
        estimatedQuantityQtl: booking.estimatedQuantityQtl,
        scheduledSlotStart: booking.scheduledSlotStart,
        scheduledSlotEnd: booking.scheduledSlotEnd,
        status: booking.status,
        centerId: booking.centerId,
        bookedDate: booking.bookedDate,
        sessionName: booking.sessionName,
        handlingDurationMinutes: totalMinutes,
        bufferMinutes: handling.bufferMinutes,
      },
    });
  } catch (err) {
    console.error("Booking error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const farmerId = searchParams.get("farmerId");

    if (!farmerId) {
      return NextResponse.json({ error: "farmerId required" }, { status: 400 });
    }

    const bookings = await db.booking.findMany({
      where: { farmerId },
      include: {
        center: { select: { name: true, district: true, state: true } },
        procurementBill: {
          include: { dbtPayment: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ bookings });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId, action, reason } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (action === "cancel") {
      if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
        return NextResponse.json(
          { error: `Cannot cancel a booking with status ${booking.status}` },
          { status: 400 }
        );
      }

      // Mark cancelled
      const updated = await db.booking.update({
        where: { id: bookingId },
        data: {
          status: "CANCELLED",
          queueEvents: {
            create: {
              eventType: "BOOKING_CANCELLED",
              description: `Token ${booking.tokenNumber} cancelled. ${reason || "Slot released to queue."}`,
              triggeredBy: "USER",
            },
          },
        },
      });

      // Auto-shift downstream waiting tokens in this session
      const downstreamWaiting = await db.booking.findMany({
        where: {
          centerId: booking.centerId,
          bookedDate: booking.bookedDate,
          sessionName: booking.sessionName,
          status: "WAITING",
          id: { not: bookingId },
        },
        orderBy: { scheduledSlotStart: "asc" },
      });

      const cancelledStartMin = timeToMinutes(booking.scheduledSlotStart);
      const cancelledEndMin = timeToMinutes(booking.scheduledSlotEnd);
      const freedMinutes = Math.max(15, cancelledEndMin - cancelledStartMin);

      for (const downstream of downstreamWaiting) {
        const currentEtaMin = timeToMinutes(downstream.dynamicEta || downstream.scheduledSlotStart);
        if (currentEtaMin >= cancelledEndMin) {
          const newEtaMin = Math.max(cancelledStartMin, currentEtaMin - freedMinutes);
          const newEtaStr = minutesToTimeStr(newEtaMin);

          await db.booking.update({
            where: { id: downstream.id },
            data: {
              dynamicEta: newEtaStr,
              queueEvents: {
                create: {
                  eventType: "QUEUE_AUTO_ADVANCED",
                  description: `Slot moved up by ~${freedMinutes}m due to cancellation. New approx window ~${newEtaStr}.`,
                  triggeredBy: "SYSTEM",
                },
              },
            },
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Booking ${booking.tokenNumber} cancelled and downstream queue advanced`,
        booking: updated,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Booking PATCH error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
