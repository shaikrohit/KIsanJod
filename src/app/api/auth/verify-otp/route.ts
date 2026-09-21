// KisanJod - OTP Verification API
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const FALLBACK_FARMERS: Record<string, any> = {
  farmer_001: {
    id: "farmer_001",
    fullName: "Gurpreet Singh",
    maskedAadhaar: "XXXXXXXX5678",
    phoneNumber: "9814012345",
    state: "Punjab",
    district: "Ludhiana",
    village: "Rampur",
    languagePreference: "hi",
    landRecords: [
      {
        khasraNumber: "142/1, 142/2",
        khatauniNumber: "KH-00421",
        subDistrictTehsil: "Ludhiana West",
        totalLandAreaAcres: 6.18,
        verifiedSownCrop: "Wheat",
        sownAreaAcres: 4.0,
        mspProductivityNormQtlPerAcre: 25.0,
        maxProcurementQuotaQtl: 100.0,
        utilizedQuotaQtl: 0.0,
        remainingQuotaQtl: 100.0,
      },
    ],
    bankAccount: {
      bankName: "Punjab National Bank",
      accountMasked: "XXXXXX4512",
      ifsc: "PUNB0012300",
      pfmsBeneficiaryCode: "PFMS-BEN-548912",
      isAadhaarLinked: true,
    },
  },
  farmer_002: {
    id: "farmer_002",
    fullName: "Venkata Ramana",
    maskedAadhaar: "XXXXXXXX4321",
    phoneNumber: "9440198765",
    state: "Andhra Pradesh",
    district: "Guntur",
    village: "Dharmavaram",
    languagePreference: "te",
    landRecords: [
      {
        khasraNumber: "204/3",
        khatauniNumber: "KH-00812",
        subDistrictTehsil: "Guntur Rural",
        totalLandAreaAcres: 4.5,
        verifiedSownCrop: "Paddy",
        sownAreaAcres: 3.5,
        mspProductivityNormQtlPerAcre: 28.0,
        maxProcurementQuotaQtl: 98.0,
        utilizedQuotaQtl: 20.0,
        remainingQuotaQtl: 78.0,
      },
    ],
    bankAccount: {
      bankName: "State Bank of India",
      accountMasked: "XXXXXX8821",
      ifsc: "SBIN0004567",
      pfmsBeneficiaryCode: "PFMS-BEN-432187",
      isAadhaarLinked: true,
    },
  },
  farmer_003: {
    id: "farmer_003",
    fullName: "Ramesh Patel",
    maskedAadhaar: "XXXXXXXX1012",
    phoneNumber: "9755011223",
    state: "Madhya Pradesh",
    district: "Sehore",
    village: "Shyampur",
    languagePreference: "hi",
    landRecords: [
      {
        khasraNumber: "88/A, 89/B",
        khatauniNumber: "KH-00199",
        subDistrictTehsil: "Sehore",
        totalLandAreaAcres: 7.0,
        verifiedSownCrop: "Chana",
        sownAreaAcres: 5.0,
        mspProductivityNormQtlPerAcre: 10.0,
        maxProcurementQuotaQtl: 50.0,
        utilizedQuotaQtl: 0.0,
        remainingQuotaQtl: 50.0,
      },
      {
        khasraNumber: "90/C",
        khatauniNumber: "KH-00201",
        subDistrictTehsil: "Sehore",
        totalLandAreaAcres: 2.0,
        verifiedSownCrop: "Wheat",
        sownAreaAcres: 2.0,
        mspProductivityNormQtlPerAcre: 25.0,
        maxProcurementQuotaQtl: 50.0,
        utilizedQuotaQtl: 0.0,
        remainingQuotaQtl: 50.0,
      },
    ],
    bankAccount: {
      bankName: "Bank of Baroda",
      accountMasked: "XXXXXX3390",
      ifsc: "BARB0SEHORE",
      pfmsBeneficiaryCode: "PFMS-BEN-987654",
      isAadhaarLinked: true,
    },
  },
  farmer_004: {
    id: "farmer_004",
    fullName: "Savitri Bai",
    maskedAadhaar: "XXXXXXXX0987",
    phoneNumber: "9822055667",
    state: "Maharashtra",
    district: "Nashik",
    village: "Lasalgaon",
    languagePreference: "hi",
    landRecords: [
      {
        khasraNumber: "51/2",
        khatauniNumber: "KH-00554",
        subDistrictTehsil: "Niphad",
        totalLandAreaAcres: 3.0,
        verifiedSownCrop: "Onion",
        sownAreaAcres: 2.0,
        mspProductivityNormQtlPerAcre: 80.0,
        maxProcurementQuotaQtl: 160.0,
        utilizedQuotaQtl: 40.0,
        remainingQuotaQtl: 120.0,
      },
      {
        khasraNumber: "52/1",
        khatauniNumber: "KH-00555",
        subDistrictTehsil: "Niphad",
        totalLandAreaAcres: 1.0,
        verifiedSownCrop: "Tomato",
        sownAreaAcres: 1.0,
        mspProductivityNormQtlPerAcre: 90.0,
        maxProcurementQuotaQtl: 90.0,
        utilizedQuotaQtl: 0.0,
        remainingQuotaQtl: 90.0,
      },
    ],
    bankAccount: {
      bankName: "Bank of Maharashtra",
      accountMasked: "XXXXXX7741",
      ifsc: "MAHB0000321",
      pfmsBeneficiaryCode: "PFMS-BEN-876543",
      isAadhaarLinked: true,
    },
  },
  farmer_005: {
    id: "farmer_005",
    fullName: "Balwan Singh",
    maskedAadhaar: "XXXXXXXX9876",
    phoneNumber: "9416044332",
    state: "Haryana",
    district: "Karnal",
    village: "Gharaunda",
    languagePreference: "hi",
    landRecords: [
      {
        khasraNumber: "311/4",
        khatauniNumber: "KH-00311",
        subDistrictTehsil: "Karnal",
        totalLandAreaAcres: 8.5,
        verifiedSownCrop: "Wheat",
        sownAreaAcres: 6.0,
        mspProductivityNormQtlPerAcre: 25.0,
        maxProcurementQuotaQtl: 150.0,
        utilizedQuotaQtl: 50.0,
        remainingQuotaQtl: 100.0,
      },
      {
        khasraNumber: "312/1",
        khatauniNumber: "KH-00312",
        subDistrictTehsil: "Karnal",
        totalLandAreaAcres: 2.5,
        verifiedSownCrop: "Paddy",
        sownAreaAcres: 2.5,
        mspProductivityNormQtlPerAcre: 28.0,
        maxProcurementQuotaQtl: 70.0,
        utilizedQuotaQtl: 0.0,
        remainingQuotaQtl: 70.0,
      },
    ],
    bankAccount: {
      bankName: "Canara Bank",
      accountMasked: "XXXXXX9912",
      ifsc: "CNRB0002100",
      pfmsBeneficiaryCode: "PFMS-BEN-765432",
      isAadhaarLinked: true,
    },
  },
  farmer_006: {
    id: "farmer_006",
    fullName: "Appa Rao",
    maskedAadhaar: "XXXXXXXX8765",
    phoneNumber: "9949088776",
    state: "Telangana",
    district: "Warangal",
    village: "Atmakur",
    languagePreference: "te",
    landRecords: [
      {
        khasraNumber: "102/1",
        khatauniNumber: "KH-00102",
        subDistrictTehsil: "Warangal Rural",
        totalLandAreaAcres: 4.0,
        verifiedSownCrop: "Moong",
        sownAreaAcres: 3.0,
        mspProductivityNormQtlPerAcre: 6.5,
        maxProcurementQuotaQtl: 19.5,
        utilizedQuotaQtl: 0.0,
        remainingQuotaQtl: 19.5,
      },
      {
        khasraNumber: "103/2",
        khatauniNumber: "KH-00103",
        subDistrictTehsil: "Warangal Rural",
        totalLandAreaAcres: 2.0,
        verifiedSownCrop: "Paddy",
        sownAreaAcres: 2.0,
        mspProductivityNormQtlPerAcre: 28.0,
        maxProcurementQuotaQtl: 56.0,
        utilizedQuotaQtl: 0.0,
        remainingQuotaQtl: 56.0,
      },
    ],
    bankAccount: {
      bankName: "Union Bank of India",
      accountMasked: "XXXXXX1154",
      ifsc: "UBIN0532145",
      pfmsBeneficiaryCode: "PFMS-BEN-654321",
      isAadhaarLinked: true,
    },
  },
  farmer_007: {
    id: "farmer_007",
    fullName: "Ram Kumar Maurya",
    maskedAadhaar: "XXXXXXXX7654",
    phoneNumber: "9450033221",
    state: "Uttar Pradesh",
    district: "Varanasi",
    village: "Pindra",
    languagePreference: "hi",
    landRecords: [
      {
        khasraNumber: "45/9",
        khatauniNumber: "KH-00045",
        subDistrictTehsil: "Pindra",
        totalLandAreaAcres: 2.5,
        verifiedSownCrop: "Tomato",
        sownAreaAcres: 1.5,
        mspProductivityNormQtlPerAcre: 90.0,
        maxProcurementQuotaQtl: 135.0,
        utilizedQuotaQtl: 0.0,
        remainingQuotaQtl: 135.0,
      },
      {
        khasraNumber: "46/2",
        khatauniNumber: "KH-00046",
        subDistrictTehsil: "Pindra",
        totalLandAreaAcres: 1.0,
        verifiedSownCrop: "Potato",
        sownAreaAcres: 1.0,
        mspProductivityNormQtlPerAcre: 100.0,
        maxProcurementQuotaQtl: 100.0,
        utilizedQuotaQtl: 0.0,
        remainingQuotaQtl: 100.0,
      },
    ],
    bankAccount: {
      bankName: "Central Bank of India",
      accountMasked: "XXXXXX6673",
      ifsc: "CBIN0281234",
      pfmsBeneficiaryCode: "PFMS-BEN-543210",
      isAadhaarLinked: true,
    },
  },
  farmer_008: {
    id: "farmer_008",
    fullName: "Mohan Lal",
    maskedAadhaar: "XXXXXXXX6543",
    phoneNumber: "9837022114",
    state: "Uttar Pradesh",
    district: "Agra",
    village: "Fatehabad",
    languagePreference: "hi",
    landRecords: [
      {
        khasraNumber: "112/5",
        khatauniNumber: "KH-00112",
        subDistrictTehsil: "Fatehabad",
        totalLandAreaAcres: 5.0,
        verifiedSownCrop: "Potato",
        sownAreaAcres: 3.0,
        mspProductivityNormQtlPerAcre: 100.0,
        maxProcurementQuotaQtl: 300.0,
        utilizedQuotaQtl: 100.0,
        remainingQuotaQtl: 200.0,
      },
      {
        khasraNumber: "113/1",
        khatauniNumber: "KH-00113",
        subDistrictTehsil: "Fatehabad",
        totalLandAreaAcres: 2.0,
        verifiedSownCrop: "Wheat",
        sownAreaAcres: 2.0,
        mspProductivityNormQtlPerAcre: 25.0,
        maxProcurementQuotaQtl: 50.0,
        utilizedQuotaQtl: 0.0,
        remainingQuotaQtl: 50.0,
      },
    ],
    bankAccount: {
      bankName: "State Bank of India",
      accountMasked: "XXXXXX5520",
      ifsc: "SBIN0001144",
      pfmsBeneficiaryCode: "PFMS-BEN-432109",
      isAadhaarLinked: true,
    },
  },
};

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

    let farmer: any = null;
    try {
      farmer = await db.farmer.findUnique({
        where: { id: farmerId },
        include: { landRecords: true, bankAccounts: true },
      });
    } catch (e) {
      console.warn("Database error during verify-otp, falling back to persona:", e);
    }

    if (!farmer) {
      const fallback = FALLBACK_FARMERS[farmerId] || FALLBACK_FARMERS.farmer_001;
      return NextResponse.json({
        success: true,
        farmer: fallback,
      });
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
        landRecords: farmer.landRecords.map((lr: any) => ({
          khasraNumber: lr.khasraNumber,
          khatauniNumber: lr.khatauniNumber,
          subDistrictTehsil: lr.subDistrictTehsil,
          totalLandAreaAcres: lr.totalLandAreaAcres,
          verifiedSownCrop: lr.verifiedSownCrop,
          sownAreaAcres: lr.sownAreaAcres,
          mspProductivityNormQtlPerAcre: lr.mspProductivityNormQtlPerAcre,
          maxProcurementQuotaQtl: lr.maxProcurementQuotaQtl,
          utilizedQuotaQtl: lr.utilizedQuotaQtl,
          remainingQuotaQtl: lr.maxProcurementQuotaQtl - lr.utilizedQuotaQtl,
        })),
        bankAccount: farmer.bankAccounts?.[0]
          ? {
              bankName: farmer.bankAccounts[0].bankName,
              accountMasked: farmer.bankAccounts[0].accountNumberMasked,
              ifsc: farmer.bankAccounts[0].ifscCode,
              pfmsBeneficiaryCode: farmer.bankAccounts[0].pfmsBeneficiaryCode,
              isAadhaarLinked: farmer.bankAccounts[0].isAadhaarLinked,
            }
          : null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
