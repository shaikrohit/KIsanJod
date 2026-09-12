// KisanJod - OTP Verification API
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { farmerId, otp } = body;

    if (!farmerId || !otp) {
      return NextResponse.json({ error: "Missing farmerId or OTP" }, { status: 400 });
    }

    // Mock OTP: accept 123456
    if (otp !== "123456") {
      return NextResponse.json({ error: "Invalid OTP. Demo OTP is 123456" }, { status: 401 });
    }

    const farmer = await db.farmer.findUnique({
      where: { id: farmerId },
      include: { landRecords: true, bankAccounts: true },
    });

    if (!farmer) {
      return NextResponse.json({ error: "Farmer not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      farmer: {
        id: farmer.id,
        fullName: farmer.fullName,
        maskedAadhaar: farmer.maskedAadhaar,
        phoneNumber: farmer.phoneNumber,
        state: farmer.state,
        district: farmer.district,
        village: farmer.village,
        languagePreference: farmer.languagePreference,
        landRecords: farmer.landRecords.map((lr) => ({
          khasraNumber: lr.khasraNumber,
          khatauniNumber: lr.khatauniNumber,
          verifiedSownCrop: lr.verifiedSownCrop,
          sownAreaAcres: lr.sownAreaAcres,
          maxProcurementQuotaQtl: lr.maxProcurementQuotaQtl,
          utilizedQuotaQtl: lr.utilizedQuotaQtl,
          remainingQuotaQtl: lr.maxProcurementQuotaQtl - lr.utilizedQuotaQtl,
        })),
        bankAccount: farmer.bankAccounts[0]
          ? {
              bankName: farmer.bankAccounts[0].bankName,
              accountMasked: farmer.bankAccounts[0].accountNumberMasked,
              ifsc: farmer.bankAccounts[0].ifscCode,
            }
          : null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
