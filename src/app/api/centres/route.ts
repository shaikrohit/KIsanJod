// KisanJod - Centres API: List procurement centres
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ALL_PROCUREMENT_CENTRES } from "@/lib/mocks/procurementCentres";
import { notifySync } from "@/lib/syncBus";

const FALLBACK_CENTRES = ALL_PROCUREMENT_CENTRES.map((c) => ({
  id: c.id,
  centerCode: c.id.toUpperCase().replace("CENTER_", "MND-"),
  name: c.name,
  state: c.state,
  district: c.district,
  address: `${c.address}, ${c.state} ${c.pinCode}`,
  baysCount: c.activeWorkers > 4 ? 3 : 2,
  maxDailySlots: Math.floor(c.maxDailyCapacity / 100),
  dailyCapacityQtl: c.maxDailyCapacity,
  isActive: c.isActive,
  activeWorkers: c.activeWorkers,
  morningSessionStart: c.morningSessionStart,
  morningSessionEnd: c.morningSessionEnd,
  afternoonSessionStart: c.afternoonSessionStart,
  afternoonSessionEnd: c.afternoonSessionEnd,
  eveningSessionEnabled: false,
  eveningSessionStart: "19:00",
  eveningSessionEnd: "23:00",
}));

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const district = searchParams.get("district");
    const state = searchParams.get("state");
    const where: Record<string, unknown> = { isActive: true };
    if (district) where.district = { contains: district, mode: "insensitive" };
    if (state) where.state = { equals: state, mode: "insensitive" };

    const centres = await db.procurementCenter.findMany({
      where,
      orderBy: { name: "asc" },
    });

    if (centres && centres.length > 0) {
      return NextResponse.json({ centres });
    }
  } catch (err) {
    console.error("Centres API error:", err);
  }

  // Resilient fallback: return master APMC centres so user interface is never empty
  const { searchParams } = new URL(req.url);
  const stateParam = searchParams.get("state");
  let fallback = FALLBACK_CENTRES;
  if (stateParam) {
    fallback = fallback.filter(c => c.state.toLowerCase() === stateParam.toLowerCase());
  }
  return NextResponse.json({ centres: fallback });
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

    notifySync({
      type: "CENTRE_UPDATED",
      centerId: updated.id,
    });

    return NextResponse.json({ success: true, center: updated });
  } catch (err) {
    console.error("Update centre error:", err);
    return NextResponse.json({ error: "Failed to update centre timings" }, { status: 500 });
  }
}

