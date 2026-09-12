// KisanJod - Auth API: Login with Aadhaar
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { aadhaarNumber } = body;

    if (!aadhaarNumber || typeof aadhaarNumber !== "string" || aadhaarNumber.replace(/\s/g, "").length !== 12) {
      return NextResponse.json({ error: "Please enter a valid 12-digit Aadhaar number" }, { status: 400 });
    }

    const cleaned = aadhaarNumber.replace(/\s/g, "");

    // Testing rule: First digit selects farmer persona (1=Gurpreet, 2=Venkata, 3=Ramesh)
    // Any other first digit (0, 4-9) is treated as invalid Aadhaar
    const firstDigit = cleaned[0];
    if (!["1", "2", "3"].includes(firstDigit)) {
      return NextResponse.json(
        { error: "Invalid Aadhaar number (Testing rule: Must start with 1, 2, or 3)" },
        { status: 400 }
      );
    }

    let farmerIdTarget = "farmer_001";
    if (firstDigit === "1") farmerIdTarget = "farmer_001";
    else if (firstDigit === "2") farmerIdTarget = "farmer_002";
    else if (firstDigit === "3") farmerIdTarget = "farmer_003";

    // Try finding exact match by aadhaar, fallback to target persona for testing
    let farmer = await db.farmer.findFirst({
      where: {
        OR: [{ aadhaarNumber: cleaned }, { id: farmerIdTarget }],
      },
      include: { landRecords: true, bankAccounts: true },
    });

    if (!farmer) {
      farmer = await db.farmer.findFirst({
        include: { landRecords: true, bankAccounts: true },
      });
    }

    if (!farmer) {
      return NextResponse.json({ error: "No farmer record found" }, { status: 404 });
    }

    // Send mock OTP
    return NextResponse.json({
      success: true,
      farmerId: farmer.id,
      maskedAadhaar: `XXXXXXXX${cleaned.slice(-4)}`,
      fullName: farmer.fullName,
      message: "OTP sent to registered mobile",
    });
  } catch (e) {
    console.error("LOGIN ERROR:", e);
    return NextResponse.json({ error: "Server error: " + String(e) }, { status: 500 });
  }
}
