// KisanJod - Slots API: Two-session visual timeline and dynamic continuous allocation for a centre on a date
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateHandlingDuration, addMinutesToTimeString } from "@/lib/handlingDuration";
import {
  to12Hour,
  formatTimeRange12h,
  formatApproxTimeRange12h,
  timeToMinutes,
  minutesToTimeStr,
  calculateTimelineProportions,
} from "@/lib/timeFormat";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id || "center_lud_01";
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const packageCount = parseInt(searchParams.get("packageCount") || "10", 10);
    const unitType = (searchParams.get("unitType") || "GUNNY_BAG_50KG") as "GUNNY_BAG_50KG" | "CRATE_25KG" | "QUINTALS";
    const capacityKg = parseInt(searchParams.get("capacityKg") || "50", 10);
    const workers = parseInt(searchParams.get("workers") || "2", 10);

    // Fetch centre info for session hours & active palledar workers
    const center = await db.procurementCenter.findUnique({
      where: { id },
      select: {
        activeWorkers: true,
        name: true,
        morningSessionStart: true,
        morningSessionEnd: true,
        afternoonSessionStart: true,
        afternoonSessionEnd: true,
      },
    }).catch(() => null);

    const activeWorkers = center?.activeWorkers || 4;

    // Calculate requested load handling duration (3 min/bag base + surcharges, scaled by active palledar gang)
    const handling = calculateHandlingDuration({
      packageCount,
      unitType,
      capacityKg,
      activeWorkers,
    });
    const durationMins = handling.totalDurationMinutes;

    // Configured session timings (Defaults: Morning 9 AM - 1 PM, Lunch Break 1 PM - 3 PM, Afternoon 3 PM - 5 PM)
    const mornStart24 = center?.morningSessionStart || "09:00";
    const mornEnd24 = center?.morningSessionEnd || "13:00";
    const aftStart24 = center?.afternoonSessionStart || "15:00";
    const aftEnd24 = center?.afternoonSessionEnd || "17:00";

    const mornStartMin = timeToMinutes(mornStart24);
    const mornEndMin = timeToMinutes(mornEnd24);
    const aftStartMin = timeToMinutes(aftStart24);
    const aftEndMin = timeToMinutes(aftEnd24);

    const mornTotalMin = Math.max(1, mornEndMin - mornStartMin);
    const aftTotalMin = Math.max(1, aftEndMin - aftStartMin);
    const lunchBreakHours = parseFloat(((aftStartMin - mornEndMin) / 60).toFixed(1));

    // Fetch existing active bookings for this center and date
    const existingBookings = await db.booking.findMany({
      where: {
        centerId: id,
        bookedDate: date,
        status: { not: "CANCELLED" },
      },
      select: {
        id: true,
        tokenNumber: true,
        scheduledSlotStart: true,
        scheduledSlotEnd: true,
        sessionName: true,
        packageCount: true,
        cropName: true,
      },
      orderBy: { scheduledSlotStart: "asc" },
    }).catch(() => []);

    // 1. Separate bookings into morning and afternoon sessions
    const morningBookingsRaw = existingBookings.filter((bk) => {
      return bk.sessionName === "MORNING" || timeToMinutes(bk.scheduledSlotStart) < mornEndMin;
    });

    const afternoonBookingsRaw = existingBookings.filter((bk) => {
      return bk.sessionName === "AFTERNOON" || timeToMinutes(bk.scheduledSlotStart) >= mornEndMin;
    });

    // Compute proportional booked segments for Morning Timeline
    const morningBookedSegments = morningBookingsRaw.map((bk) => {
      const { leftPercent, widthPercent } = calculateTimelineProportions(
        bk.scheduledSlotStart,
        bk.scheduledSlotEnd,
        mornStart24,
        mornEnd24
      );
      return {
        id: bk.id,
        tokenNumber: bk.tokenNumber,
        sessionName: "MORNING",
        startTime24: bk.scheduledSlotStart,
        endTime24: bk.scheduledSlotEnd,
        startTime12: to12Hour(bk.scheduledSlotStart),
        endTime12: to12Hour(bk.scheduledSlotEnd),
        packageCount: bk.packageCount,
        cropName: bk.cropName,
        leftPercent,
        widthPercent,
      };
    });

    // Compute proportional booked segments for Afternoon Timeline
    const afternoonBookedSegments = afternoonBookingsRaw.map((bk) => {
      const { leftPercent, widthPercent } = calculateTimelineProportions(
        bk.scheduledSlotStart,
        bk.scheduledSlotEnd,
        aftStart24,
        aftEnd24
      );
      return {
        id: bk.id,
        tokenNumber: bk.tokenNumber,
        sessionName: "AFTERNOON",
        startTime24: bk.scheduledSlotStart,
        endTime24: bk.scheduledSlotEnd,
        startTime12: to12Hour(bk.scheduledSlotStart),
        endTime12: to12Hour(bk.scheduledSlotEnd),
        packageCount: bk.packageCount,
        cropName: bk.cropName,
        leftPercent,
        widthPercent,
      };
    });

    // 2. Consecutive dynamic scheduling for MORNING
    let bestMornStartMin = mornStartMin;
    morningBookingsRaw.forEach((bk) => {
      const endMin = timeToMinutes(bk.scheduledSlotEnd);
      if (endMin > bestMornStartMin) {
        bestMornStartMin = endMin;
      }
    });

    const mornRemainingMin = Math.max(0, mornEndMin - bestMornStartMin);
    const isMornFull = mornRemainingMin < 15;

    let mornSlotStart24 = minutesToTimeStr(bestMornStartMin);
    let mornSlotEnd24 = addMinutesToTimeString(mornSlotStart24, durationMins);
    let mornHasLunchSpillover = false;
    let mornPart1Duration = durationMins;
    let mornPart2Duration = 0;
    let mornPart2Start24 = aftStart24;
    let mornPart2End24 = aftStart24;

    if (bestMornStartMin + durationMins > mornEndMin && !isMornFull) {
      mornHasLunchSpillover = true;
      mornPart1Duration = Math.max(0, mornEndMin - bestMornStartMin);
      mornPart2Duration = durationMins - mornPart1Duration;
      mornPart2Start24 = aftStart24;
      mornPart2End24 = minutesToTimeStr(aftStartMin + mornPart2Duration);
      mornSlotEnd24 = mornPart2End24;
    }

    const { leftPercent: mornCandidateLeft, widthPercent: mornCandidateWidth } = calculateTimelineProportions(
      mornSlotStart24,
      mornHasLunchSpillover ? mornEnd24 : mornSlotEnd24,
      mornStart24,
      mornEnd24
    );

    // 3. Consecutive dynamic scheduling for AFTERNOON
    let bestAftStartMin = aftStartMin;
    afternoonBookingsRaw.forEach((bk) => {
      const endMin = timeToMinutes(bk.scheduledSlotEnd);
      if (endMin > bestAftStartMin) {
        bestAftStartMin = endMin;
      }
    });

    const aftRemainingMin = Math.max(0, aftEndMin - bestAftStartMin);
    const isAftFull = aftRemainingMin < 15;

    const aftSlotStart24 = minutesToTimeStr(bestAftStartMin);
    const aftSlotEnd24 = addMinutesToTimeString(aftSlotStart24, durationMins);

    const { leftPercent: aftCandidateLeft, widthPercent: aftCandidateWidth } = calculateTimelineProportions(
      aftSlotStart24,
      aftSlotEnd24,
      aftStart24,
      aftEnd24
    );

    const sessions = {
      morningSession: {
        sessionName: "MORNING",
        name: "Morning Session",
        startTime24: mornStart24,
        endTime24: mornEnd24,
        startTime12: to12Hour(mornStart24),
        endTime12: to12Hour(mornEnd24),
        timeLabel12: formatTimeRange12h(mornStart24, mornEnd24),
        totalMinutes: mornTotalMin,
        availableMinutes: mornRemainingMin,
        isFull: isMornFull,
        bookedSegments: morningBookedSegments,
        suggestedSlot: {
          sessionName: "MORNING",
          startTime24: mornSlotStart24,
          endTime24: mornSlotEnd24,
          startTime12: to12Hour(mornSlotStart24),
          endTime12: to12Hour(mornSlotEnd24),
          approxDisplay: formatApproxTimeRange12h(mornSlotStart24, mornSlotEnd24),
          durationMinutes: durationMins,
          hasLunchSpillover: mornHasLunchSpillover,
          spilloverDetails: mornHasLunchSpillover
            ? {
                part1TimeRange12: formatTimeRange12h(mornSlotStart24, mornEnd24),
                part1DurationMinutes: mornPart1Duration,
                part2TimeRange12: formatTimeRange12h(mornPart2Start24, mornPart2End24),
                part2DurationMinutes: mornPart2Duration,
                lunchNotice: `Unloading will pause during the 2-hour lunch break (${to12Hour(mornEnd24)} – ${to12Hour(aftStart24)}) and resume at ${to12Hour(aftStart24)}.`,
              }
            : null,
          candidateLeftPercent: mornCandidateLeft,
          candidateWidthPercent: mornCandidateWidth,
        },
      },
      lunchBreak: {
        startTime24: mornEnd24,
        endTime24: aftStart24,
        startTime12: to12Hour(mornEnd24),
        endTime12: to12Hour(aftStart24),
        durationHours: lunchBreakHours,
        label: `${to12Hour(mornEnd24)} – ${to12Hour(aftStart24)} (Lunch & Worker Shift Break · ${lunchBreakHours}h)`,
      },
      afternoonSession: {
        sessionName: "AFTERNOON",
        name: "Afternoon Session",
        startTime24: aftStart24,
        endTime24: aftEnd24,
        startTime12: to12Hour(aftStart24),
        endTime12: to12Hour(aftEnd24),
        timeLabel12: formatTimeRange12h(aftStart24, aftEnd24),
        totalMinutes: aftTotalMin,
        availableMinutes: aftRemainingMin,
        isFull: isAftFull,
        bookedSegments: afternoonBookedSegments,
        suggestedSlot: {
          sessionName: "AFTERNOON",
          startTime24: aftSlotStart24,
          endTime24: aftSlotEnd24,
          startTime12: to12Hour(aftSlotStart24),
          endTime12: to12Hour(aftSlotEnd24),
          approxDisplay: formatApproxTimeRange12h(aftSlotStart24, aftSlotEnd24),
          durationMinutes: durationMins,
          hasLunchSpillover: false,
          candidateLeftPercent: aftCandidateLeft,
          candidateWidthPercent: aftCandidateWidth,
        },
      },
    };

    const dynamicSlots = [
      {
        session: "MORNING",
        sessionName: "Morning Session",
        hourOfDay: parseInt(mornSlotStart24.split(":")[0], 10),
        startTime: mornSlotStart24,
        endTime: mornSlotEnd24,
        startTime12: to12Hour(mornSlotStart24),
        endTime12: to12Hour(mornSlotEnd24),
        timeLabel: formatTimeRange12h(mornSlotStart24, mornSlotEnd24),
        approxDisplay: formatApproxTimeRange12h(mornSlotStart24, mornSlotEnd24),
        durationMinutes: durationMins,
        bufferMinutes: handling.bufferMinutes,
        available: isMornFull ? 0 : 1,
        isFull: isMornFull,
        isNextDynamicConsecutive: true,
      },
      {
        session: "AFTERNOON",
        sessionName: "Afternoon Session",
        hourOfDay: parseInt(aftSlotStart24.split(":")[0], 10),
        startTime: aftSlotStart24,
        endTime: aftSlotEnd24,
        startTime12: to12Hour(aftSlotStart24),
        endTime12: to12Hour(aftSlotEnd24),
        timeLabel: formatTimeRange12h(aftSlotStart24, aftSlotEnd24),
        approxDisplay: formatApproxTimeRange12h(aftSlotStart24, aftSlotEnd24),
        durationMinutes: durationMins,
        bufferMinutes: handling.bufferMinutes,
        available: isAftFull ? 0 : 1,
        isFull: isAftFull,
        isNextDynamicConsecutive: true,
      },
    ];

    return NextResponse.json({
      centerId: id,
      date,
      handling,
      activeWorkers,
      sessions,
      slots: dynamicSlots,
      dynamicSlots,
    });
  } catch (err) {
    console.error("Slots API error:", err);
    const fallbackHandling = calculateHandlingDuration({
      packageCount: 10,
      unitType: "GUNNY_BAG_50KG",
      capacityKg: 50,
      activeWorkers: 4,
    });
    return NextResponse.json({
      centerId: "center_lud_01",
      date: new Date().toISOString().split("T")[0],
      handling: fallbackHandling,
      activeWorkers: 4,
      sessions: {
        morningSession: {
          sessionName: "MORNING",
          sessionLabel: "Morning Session",
          timeWindow24: "09:00 - 13:00",
          timeWindow12: "09:00 AM - 01:00 PM",
          suggestedSlot: {
            startTime24: "09:00",
            endTime24: "09:40",
            startTime12: "09:00 AM",
            endTime12: "09:40 AM",
            durationMinutes: 30,
            bufferMinutes: 10,
            hasLunchSpillover: false,
            bayAssigned: 1,
            bayLabel: "Bay 1 (Express Unloading)",
          },
          isFull: false,
          bookedCount: 0,
          totalCapacity: 8,
          bookedSegments: [],
        },
        afternoonSession: {
          sessionName: "AFTERNOON",
          sessionLabel: "Afternoon Session",
          timeWindow24: "15:00 - 17:00",
          timeWindow12: "03:00 PM - 05:00 PM",
          suggestedSlot: {
            startTime24: "15:00",
            endTime24: "15:40",
            startTime12: "03:00 PM",
            endTime12: "03:40 PM",
            durationMinutes: 30,
            bufferMinutes: 10,
            hasLunchSpillover: false,
            bayAssigned: 1,
            bayLabel: "Bay 1 (Express Unloading)",
          },
          isFull: false,
          bookedCount: 0,
          totalCapacity: 6,
          bookedSegments: [],
        },
      },
      slots: [],
      dynamicSlots: [],
    });
  }
}