// ============================================================================
// KisanJod - Centres API: Standalone Zero-Cloud-Dependency Engine
// Department of Consumer Affairs (DoCA), Ministry of Consumer Affairs
// 100% In-Memory Deterministic Operation for Local & Cloud Deployments
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { standaloneStore } from "@/lib/standaloneStore";
import { notifySync } from "@/lib/syncBus";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const district = searchParams.get("district") || undefined;
    const state = searchParams.get("state") || undefined;

    const centres = standaloneStore.getCentres({ state, district });
    return NextResponse.json({ centres });
  } catch (err: unknown) {
    console.error("Centres API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch centres" },
      { status: 500 }
    );
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

    const updated = standaloneStore.updateCentre(centerId, {
      ...(morningSessionStart && { morningSessionStart }),
      ...(morningSessionEnd && { morningSessionEnd }),
      ...(afternoonSessionStart && { afternoonSessionStart }),
      ...(afternoonSessionEnd && { afternoonSessionEnd }),
      ...(typeof eveningSessionEnabled === "boolean" && { eveningSessionEnabled }),
      ...(eveningSessionStart && { eveningSessionStart }),
      ...(eveningSessionEnd && { eveningSessionEnd }),
      ...(typeof activeWorkers === "number" && activeWorkers > 0 && { activeWorkers }),
    });

    if (!updated) {
      return NextResponse.json({ error: "Centre not found" }, { status: 404 });
    }

    notifySync({
      type: "CENTRE_UPDATED",
      centerId: updated.id,
    });

    return NextResponse.json({ success: true, center: updated });
  } catch (err: unknown) {
    console.error("Update centre error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update centre timings" },
      { status: 500 }
    );
  }
}
