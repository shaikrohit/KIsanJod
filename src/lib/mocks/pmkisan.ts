// ============================================================================
// KisanJod - PM-KISAN & Bhulekh Land Records Mock Service
// Ministry of Agriculture & Farmers Welfare, Government of India
// 100% Self-Contained Local Implementation — Zero External Network Calls
// ============================================================================

export interface MockLandHolding {
  khasraNumber: string;
  khatauniNumber: string;
  village: string;
  subDistrictTehsil: string;
  district: string;
  state: string;
  totalLandAreaAcres: number;
  cropSeason: string;
  verifiedSownCrop: string;
  sownAreaAcres: number;
  mspProductivityNormQtlPerAcre: number;
  maxProcurementQuotaQtl: number;
  utilizedQuotaQtl: number;
  remainingQuotaQtl: number;
}

export interface MockFarmerRecord {
  farmerRegistrationId: string;
  aadhaarNumber: string;
  maskedAadhaar: string;
  fullName: string;
  gender: "MALE" | "FEMALE";
  phoneNumber: string;
  maskedMobile: string;
  state: string;
  district: string;
  village: string;
  languagePreference: "en" | "hi" | "te";
  bankDetails: {
    bankName: string;
    accountNumberMasked: string;
    ifscCode: string;
    pfmsBeneficiaryCode: string;
    apbsMapped: boolean;
  };
  landHoldings: MockLandHolding[];
}

export interface AadhaarAuthResult {
  success: boolean;
  maskedMobile?: string;
  demoOtpHint?: string;
  error?: string;
}

export interface OtpVerificationResult {
  success: boolean;
  farmer?: MockFarmerRecord;
  sessionToken?: string;
  error?: string;
}

// ----------------------------------------------------------------------------
// Local In-Memory Pre-Seeded PM-KISAN Database (8 Farmer Personas)
// ----------------------------------------------------------------------------

export const PM_KISAN_DATABASE: Record<string, MockFarmerRecord> = {
  "548912345678": {
    farmerRegistrationId: "PMK-IND-2024-88491",
    aadhaarNumber: "548912345678",
    maskedAadhaar: "XXXXXXXX5678",
    fullName: "Gurpreet Singh",
    gender: "MALE",
    phoneNumber: "9814012345",
    maskedMobile: "+91 98XXX-XX345",
    state: "Punjab",
    district: "Ludhiana",
    village: "Rampur",
    languagePreference: "hi",
    bankDetails: {
      bankName: "Punjab National Bank",
      accountNumberMasked: "XXXXXX4512",
      ifscCode: "PUNB0012300",
      pfmsBeneficiaryCode: "PFMS-BEN-548912",
      apbsMapped: true,
    },
    landHoldings: [
      {
        khasraNumber: "142/1, 142/2",
        khatauniNumber: "KH-00421",
        village: "Rampur",
        subDistrictTehsil: "Ludhiana West",
        district: "Ludhiana",
        state: "Punjab",
        totalLandAreaAcres: 6.18,
        cropSeason: "RABI_2024_25",
        verifiedSownCrop: "Wheat",
        sownAreaAcres: 4.0,
        mspProductivityNormQtlPerAcre: 25.0,
        maxProcurementQuotaQtl: 100.0,
        utilizedQuotaQtl: 0.0,
        remainingQuotaQtl: 100.0,
      },
    ],
  },
  "432187654321": {
    farmerRegistrationId: "PMK-IND-2024-88492",
    aadhaarNumber: "432187654321",
    maskedAadhaar: "XXXXXXXX4321",
    fullName: "Venkata Ramana",
    gender: "MALE",
    phoneNumber: "9440198765",
    maskedMobile: "+91 94XXX-XX765",
    state: "Andhra Pradesh",
    district: "Guntur",
    village: "Dharmavaram",
    languagePreference: "te",
    bankDetails: {
      bankName: "State Bank of India",
      accountNumberMasked: "XXXXXX8821",
      ifscCode: "SBIN0004567",
      pfmsBeneficiaryCode: "PFMS-BEN-432187",
      apbsMapped: true,
    },
    landHoldings: [
      {
        khasraNumber: "204/3",
        khatauniNumber: "KH-00812",
        village: "Dharmavaram",
        subDistrictTehsil: "Guntur Rural",
        district: "Guntur",
        state: "Andhra Pradesh",
        totalLandAreaAcres: 4.5,
        cropSeason: "KHARIF_2024_25",
        verifiedSownCrop: "Paddy",
        sownAreaAcres: 3.5,
        mspProductivityNormQtlPerAcre: 28.0,
        maxProcurementQuotaQtl: 98.0,
        utilizedQuotaQtl: 20.0,
        remainingQuotaQtl: 78.0,
      },
    ],
  },
  "987654321012": {
    farmerRegistrationId: "PMK-IND-2024-88493",
    aadhaarNumber: "987654321012",
    maskedAadhaar: "XXXXXXXX1012",
    fullName: "Ramesh Patel",
    gender: "MALE",
    phoneNumber: "9755011223",
    maskedMobile: "+91 97XXX-XX223",
    state: "Madhya Pradesh",
    district: "Sehore",
    village: "Shyampur",
    languagePreference: "hi",
    bankDetails: {
      bankName: "Bank of Baroda",
      accountNumberMasked: "XXXXXX3390",
      ifscCode: "BARB0SEHORE",
      pfmsBeneficiaryCode: "PFMS-BEN-987654",
      apbsMapped: true,
    },
    landHoldings: [
      {
        khasraNumber: "88/A, 89/B",
        khatauniNumber: "KH-00199",
        village: "Shyampur",
        subDistrictTehsil: "Sehore",
        district: "Sehore",
        state: "Madhya Pradesh",
        totalLandAreaAcres: 7.0,
        cropSeason: "RABI_2024_25",
        verifiedSownCrop: "Chana",
        sownAreaAcres: 5.0,
        mspProductivityNormQtlPerAcre: 10.0,
        maxProcurementQuotaQtl: 50.0,
        utilizedQuotaQtl: 0.0,
        remainingQuotaQtl: 50.0,
      },
    ],
  },
  "876543210987": {
    farmerRegistrationId: "PMK-IND-2024-88494",
    aadhaarNumber: "876543210987",
    maskedAadhaar: "XXXXXXXX0987",
    fullName: "Savitri Bai",
    gender: "FEMALE",
    phoneNumber: "9822055667",
    maskedMobile: "+91 98XXX-XX667",
    state: "Maharashtra",
    district: "Nashik",
    village: "Lasalgaon",
    languagePreference: "hi",
    bankDetails: {
      bankName: "Bank of Maharashtra",
      accountNumberMasked: "XXXXXX7741",
      ifscCode: "MAHB0000321",
      pfmsBeneficiaryCode: "PFMS-BEN-876543",
      apbsMapped: true,
    },
    landHoldings: [
      {
        khasraNumber: "51/2",
        khatauniNumber: "KH-00554",
        village: "Lasalgaon",
        subDistrictTehsil: "Niphad",
        district: "Nashik",
        state: "Maharashtra",
        totalLandAreaAcres: 3.0,
        cropSeason: "RABI_2024_25",
        verifiedSownCrop: "Onion",
        sownAreaAcres: 2.0,
        mspProductivityNormQtlPerAcre: 80.0,
        maxProcurementQuotaQtl: 160.0,
        utilizedQuotaQtl: 40.0,
        remainingQuotaQtl: 120.0,
      },
    ],
  },
  "765432109876": {
    farmerRegistrationId: "PMK-IND-2024-88495",
    aadhaarNumber: "765432109876",
    maskedAadhaar: "XXXXXXXX9876",
    fullName: "Balwan Singh",
    gender: "MALE",
    phoneNumber: "9416044332",
    maskedMobile: "+91 94XXX-XX332",
    state: "Haryana",
    district: "Karnal",
    village: "Gharaunda",
    languagePreference: "hi",
    bankDetails: {
      bankName: "Canara Bank",
      accountNumberMasked: "XXXXXX9912",
      ifscCode: "CNRB0002100",
      pfmsBeneficiaryCode: "PFMS-BEN-765432",
      apbsMapped: true,
    },
    landHoldings: [
      {
        khasraNumber: "311/4",
        khatauniNumber: "KH-00311",
        village: "Gharaunda",
        subDistrictTehsil: "Karnal",
        district: "Karnal",
        state: "Haryana",
        totalLandAreaAcres: 8.5,
        cropSeason: "RABI_2024_25",
        verifiedSownCrop: "Wheat",
        sownAreaAcres: 6.0,
        mspProductivityNormQtlPerAcre: 25.0,
        maxProcurementQuotaQtl: 150.0,
        utilizedQuotaQtl: 50.0,
        remainingQuotaQtl: 100.0,
      },
    ],
  },
  "654321098765": {
    farmerRegistrationId: "PMK-IND-2024-88496",
    aadhaarNumber: "654321098765",
    maskedAadhaar: "XXXXXXXX8765",
    fullName: "Appa Rao",
    gender: "MALE",
    phoneNumber: "9949088776",
    maskedMobile: "+91 99XXX-XX776",
    state: "Telangana",
    district: "Warangal",
    village: "Atmakur",
    languagePreference: "te",
    bankDetails: {
      bankName: "Union Bank of India",
      accountNumberMasked: "XXXXXX1154",
      ifscCode: "UBIN0532145",
      pfmsBeneficiaryCode: "PFMS-BEN-654321",
      apbsMapped: true,
    },
    landHoldings: [
      {
        khasraNumber: "102/1",
        khatauniNumber: "KH-00102",
        village: "Atmakur",
        subDistrictTehsil: "Warangal Rural",
        district: "Warangal",
        state: "Telangana",
        totalLandAreaAcres: 4.0,
        cropSeason: "KHARIF_2024_25",
        verifiedSownCrop: "Moong",
        sownAreaAcres: 3.0,
        mspProductivityNormQtlPerAcre: 6.5,
        maxProcurementQuotaQtl: 19.5,
        utilizedQuotaQtl: 0.0,
        remainingQuotaQtl: 19.5,
      },
    ],
  },
  "543210987654": {
    farmerRegistrationId: "PMK-IND-2024-88497",
    aadhaarNumber: "543210987654",
    maskedAadhaar: "XXXXXXXX7654",
    fullName: "Ram Kumar Maurya",
    gender: "MALE",
    phoneNumber: "9450033221",
    maskedMobile: "+91 94XXX-XX221",
    state: "Uttar Pradesh",
    district: "Varanasi",
    village: "Pindra",
    languagePreference: "hi",
    bankDetails: {
      bankName: "Central Bank of India",
      accountNumberMasked: "XXXXXX6673",
      ifscCode: "CBIN0281234",
      pfmsBeneficiaryCode: "PFMS-BEN-543210",
      apbsMapped: true,
    },
    landHoldings: [
      {
        khasraNumber: "45/9",
        khatauniNumber: "KH-00045",
        village: "Pindra",
        subDistrictTehsil: "Pindra",
        district: "Varanasi",
        state: "Uttar Pradesh",
        totalLandAreaAcres: 2.5,
        cropSeason: "RABI_2024_25",
        verifiedSownCrop: "Tomato",
        sownAreaAcres: 1.5,
        mspProductivityNormQtlPerAcre: 90.0,
        maxProcurementQuotaQtl: 135.0,
        utilizedQuotaQtl: 0.0,
        remainingQuotaQtl: 135.0,
      },
    ],
  },
  "432109876543": {
    farmerRegistrationId: "PMK-IND-2024-88498",
    aadhaarNumber: "432109876543",
    maskedAadhaar: "XXXXXXXX6543",
    fullName: "Mohan Lal",
    gender: "MALE",
    phoneNumber: "9837022114",
    maskedMobile: "+91 98XXX-XX114",
    state: "Uttar Pradesh",
    district: "Agra",
    village: "Fatehabad",
    languagePreference: "hi",
    bankDetails: {
      bankName: "State Bank of India",
      accountNumberMasked: "XXXXXX5520",
      ifscCode: "SBIN0001144",
      pfmsBeneficiaryCode: "PFMS-BEN-432109",
      apbsMapped: true,
    },
    landHoldings: [
      {
        khasraNumber: "112/5",
        khatauniNumber: "KH-00112",
        village: "Fatehabad",
        subDistrictTehsil: "Fatehabad",
        district: "Agra",
        state: "Uttar Pradesh",
        totalLandAreaAcres: 5.0,
        cropSeason: "RABI_2024_25",
        verifiedSownCrop: "Potato",
        sownAreaAcres: 3.0,
        mspProductivityNormQtlPerAcre: 100.0,
        maxProcurementQuotaQtl: 300.0,
        utilizedQuotaQtl: 100.0,
        remainingQuotaQtl: 200.0,
      },
    ],
  },
};

// Aliases for compatibility
export const PM_KISAN_REGISTRY = PM_KISAN_DATABASE;

export function verifyMockOtp(aadhaarNumber: string, otp: string): boolean {
  return otp === "123456";
}

// ----------------------------------------------------------------------------
// Mock Service Methods
// ----------------------------------------------------------------------------

export const pmKisanMock = {
  /**
   * Verify 12-digit Aadhaar UID format and simulate OTP challenge dispatch
   */
  verifyAadhaar(aadhaarNumber: string): AadhaarAuthResult {
    const cleaned = aadhaarNumber.replace(/[\s-]/g, "");
    if (!/^\d{12}$/.test(cleaned)) {
      return {
        success: false,
        error: "Aadhaar number must be exactly 12 numeric digits.",
      };
    }

    const farmer = PM_KISAN_DATABASE[cleaned];
    if (!farmer) {
      return {
        success: false,
        error: "Aadhaar number is not registered with PM-KISAN database.",
      };
    }

    return {
      success: true,
      maskedMobile: farmer.maskedMobile,
      demoOtpHint: "123456",
    };
  },

  /**
   * Validate entered OTP against the mock demo hint (123456)
   */
  validateOtp(aadhaarNumber: string, otp: string): OtpVerificationResult {
    const cleanedAadhaar = aadhaarNumber.replace(/[\s-]/g, "");
    const cleanedOtp = otp.trim();

    if (cleanedOtp !== "123456") {
      return {
        success: false,
        error: "Invalid OTP entered. For demo evaluation, enter 123456.",
      };
    }

    const farmer = PM_KISAN_DATABASE[cleanedAadhaar];
    if (!farmer) {
      return {
        success: false,
        error: "Farmer profile not found for this Aadhaar UID.",
      };
    }

    // Synthesize deterministic session token
    const sessionToken = `KJ-SESSION-${farmer.aadhaarNumber}-${Date.now()}`;

    return {
      success: true,
      farmer,
      sessionToken,
    };
  },

  /**
   * Retrieve pre-seeded land holdings for verified Aadhaar
   */
  getLandRecords(aadhaarNumber: string): MockLandHolding[] {
    const cleaned = aadhaarNumber.replace(/[\s-]/g, "");
    const farmer = PM_KISAN_DATABASE[cleaned];
    return farmer ? farmer.landHoldings : [];
  },

  /**
   * Retrieve entire mock farmer record by Aadhaar
   */
  getFarmerProfile(aadhaarNumber: string): MockFarmerRecord | null {
    const cleaned = aadhaarNumber.replace(/[\s-]/g, "");
    return PM_KISAN_DATABASE[cleaned] || null;
  },

  /**
   * Calculate statutory maximum procurement quota based on crop and sown acreage
   */
  calculateQuota(sownCrop: string, sownAreaAcres: number): { normQtlPerAcre: number; maxQuotaQtl: number } {
    const norms: Record<string, number> = {
      Wheat: 25.0,
      Paddy: 28.0,
      Chana: 10.0,
      Moong: 6.5,
      Onion: 80.0,
      Tomato: 90.0,
      Potato: 100.0,
    };

    const norm = norms[sownCrop] || 20.0;
    const maxQuota = parseFloat((sownAreaAcres * norm).toFixed(2));
    return {
      normQtlPerAcre: norm,
      maxQuotaQtl: maxQuota,
    };
  },

  /**
   * Return all mock farmers for automated test runners
   */
  getAllMockFarmers(): MockFarmerRecord[] {
    return Object.values(PM_KISAN_DATABASE);
  },
};

export default pmKisanMock;

