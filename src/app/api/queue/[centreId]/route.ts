// KisanJod - Queue API: Live queue state for a centre (100% Standalone Self-Contained)
import { NextRequest, NextResponse } from "next/server";
import { standaloneStore } from "@/lib/standaloneStore";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ centreId: string }> }
) {
  try {
    const { centreId } = await params;
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || undefined;

    const queueState = standaloneStore.getQueueForCentre(centreId, dateParam);
    return NextResponse.json(queueState);
  } catch (err) {
    console.error("Queue API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
