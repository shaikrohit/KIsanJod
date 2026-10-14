// KisanJod - Admin Stats API (100% Standalone Self-Contained)
import { NextResponse } from "next/server";
import { standaloneStore } from "@/lib/standaloneStore";

export async function GET() {
  try {
    const stats = standaloneStore.getAdminStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("Admin stats error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
