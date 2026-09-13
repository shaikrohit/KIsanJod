// KisanJod - Centres API: List procurement centres
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const FALLBACK_CENTRES = [
  {
    id: "center_lud_01",
    centerCode: "MND-LUD-01",
    name: "Ludhiana Central Grain Mandi",
    state: "Punjab",
    district: "Ludhiana",
    address: "GT Road, Near Grain Market Gate 2, Ludhiana, Punjab 141001",
    baysCount: 3,
    maxDailySlots: 45,
    dailyCapacityQtl: 4500,
    isActive: true,
    activeWorkers: 4,
    morningSessionStart: "09:00",
    morningSessionEnd: "13:00",
    afternoonSessionStart: "15:00",
    afternoonSessionEnd: "17:00",
    eveningSessionEnabled: false,
    eveningSessionStart: "19:00",
    eveningSessionEnd: "23:00",
  },
  {
    id: "center_gnt_01",
    centerCode: "MND-GNT-01",
    name: "Guntur Agricultural Market Yard",
    state: "Andhra Pradesh",
    district: "Guntur",
    address: "Market Yard Road, Collectorate Area, Guntur, Andhra Pradesh 522004",
    baysCount: 2,
    maxDailySlots: 30,
    dailyCapacityQtl: 3000,
    isActive: true,
    activeWorkers: 4,
    morningSessionStart: "09:00",
    morningSessionEnd: "13:00",
    afternoonSessionStart: "15:00",
    afternoonSessionEnd: "17:00",
    eveningSessionEnabled: false,
    eveningSessionStart: "19:00",
    eveningSessionEnd: "23:00",
  },
  {
    id: "center_seh_01",
    centerCode: "MND-SEH-01",
    name: "Sehore Krishi Upaj Mandi",
    state: "Madhya Pradesh",
    district: "Sehore",
    address: "Mandi Campus, Bhopal-Indore Highway, Sehore, Madhya Pradesh 466001",
    baysCount: 2,
    maxDailySlots: 30,
    dailyCapacityQtl: 2800,
    isActive: true,
    activeWorkers: 4,
    morningSessionStart: "09:00",
    morningSessionEnd: "13:00",
    afternoonSessionStart: "15:00",
    afternoonSessionEnd: "17:00",
    eveningSessionEnabled: false,
    eveningSessionStart: "19:00",
    eveningSessionEnd: "23:00",
  },
  {
    id: "center_nsk_01",
    centerCode: "MND-NSK-01",
    name: "Nashik Lasalgaon APMC Market",
    state: "Maharashtra",
    district: "Nashik",
    address: "Lasalgaon Station Road, Niphad, Nashik, Maharashtra 422306",
    baysCount: 2,
    maxDailySlots: 30,
    dailyCapacityQtl: 3500,
    isActive: true,
    activeWorkers: 4,
    morningSessionStart: "09:00",
    morningSessionEnd: "13:00",
    afternoonSessionStart: "15:00",
    afternoonSessionEnd: "17:00",
    eveningSessionEnabled: false,
    eveningSessionStart: "19:00",
    eveningSessionEnd: "23:00",
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const district = searchParams.get("district");
    const where: Record<string, unknown> = { isActive: true };
    if (district) where.district = { contains: district, mode: "insensitive" };

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
  return NextResponse.json({ centres: FALLBACK_CENTRES });
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

