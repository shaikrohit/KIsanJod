// KisanJod - Operator Auth API (100% Standalone Self-Contained)
import { NextRequest, NextResponse } from "next/server";
import { standaloneStore } from "@/lib/standaloneStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, pin } = body;

    if (!employeeId || !pin) {
      return NextResponse.json({ error: "Employee ID and PIN required" }, { status: 400 });
    }

    const operator = standaloneStore.authenticateOperator(employeeId, pin);

    if (!operator) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      operator: {
        id: operator.id,
        employeeId: operator.employeeId,
        fullName: operator.fullName,
        role: operator.role,
        center: {
          id: operator.center.id,
          name: operator.center.name,
          centerCode: operator.center.centerCode,
          district: operator.center.district,
        },
      },
    });
  } catch (err) {
    console.error("Operator Login error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
