// KisanJod - Operator Auth API
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, pin } = body;

    if (!employeeId || !pin) {
      return NextResponse.json({ error: "Employee ID and PIN required" }, { status: 400 });
    }

    const operator = await db.operator.findUnique({
      where: { employeeId },
      include: { center: true },
    });

    if (!operator || operator.pinCode !== pin) {
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
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
