// KisanJod - Centres API: List procurement centres
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const district = searchParams.get("district");

    const where: Record<string, unknown> = { isActive: true };
    if (district) where.district = { contains: district };

    const centres = await db.procurementCenter.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ centres });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      centerId,
      morningSessionStart,
      morningSessionEnd,
      afternoonSessionStart,
      afternoonSessionEnd,
      eveningSessionEnabled,
      eveningSessionStart,
      eveningSessionEnd,
      activeWorkers,
    } = body;

    if (!centerId) {
      return NextResponse.json({ error: "centerId is required" }, { status: 400 });
    }

    const updated = await db.procurementCenter.update({
      where: { id: centerId },
      data: {
        ...(morningSessionStart && { morningSessionStart }),
        ...(morningSessionEnd && { morningSessionEnd }),
        ...(afternoonSessionStart && { afternoonSessionStart }),
        ...(afternoonSessionEnd && { afternoonSessionEnd }),
        ...(typeof eveningSessionEnabled === "boolean" && { eveningSessionEnabled }),
        ...(eveningSessionStart && { eveningSessionStart }),
        ...(eveningSessionEnd && { eveningSessionEnd }),
        ...(typeof activeWorkers === "number" && activeWorkers > 0 && { activeWorkers }),
      },
    });

    return NextResponse.json({ success: true, center: updated });
  } catch (err) {
    console.error("Update centre error:", err);
    return NextResponse.json({ error: "Failed to update centre timings" }, { status: 500 });
  }
}

