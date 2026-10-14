// ============================================================================
// KisanJod - Bookings API: Standalone Zero-Cloud-Dependency Engine
// Department of Consumer Affairs (DoCA), Ministry of Consumer Affairs
// 100% In-Memory Deterministic Operation for Local & Cloud Deployments
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { standaloneStore } from "@/lib/standaloneStore";

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

    const result = standaloneStore.createBooking({
      farmerId,
      centerId,
      cropName,
      packageCount: parsedPkgCount,
      capacityKg: capacityKg ? Number(capacityKg) : undefined,
      date,
      hourOfDay,
      startTime,
      endTime,
      bayAssigned,
      sessionName,
      unitType,
      rescheduleBookingId,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          errorType: result.errorType,
          error: result.error,
          ...(result.details ? { details: result.details } : {}),
          ...(result.quotaDetails ? { quotaDetails: result.quotaDetails } : {}),
          ...(result.conflictDetails ? { conflictDetails: result.conflictDetails } : {}),
        },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: result.booking,
    });
  } catch (err: unknown) {
    console.error("Booking POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const farmerId = searchParams.get("farmerId");

    if (!farmerId) {
      return NextResponse.json({ error: "farmerId required" }, { status: 400 });
    }

    const bookings = standaloneStore.getFarmerBookings(farmerId);

    return NextResponse.json({ bookings });
  } catch (err: unknown) {
    console.error("Bookings GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId, action, reason } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    if (action === "cancel") {
      const result = standaloneStore.cancelBooking(bookingId);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.status || 400 });
      }

      return NextResponse.json({
        success: true,
        message: result.message,
        booking: result.booking,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Booking PATCH error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
