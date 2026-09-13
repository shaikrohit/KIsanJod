// ============================================================================
// KisanJod - Master Database Seeding Script
// Department of Consumer Affairs (DoCA), Government of India
// Populates 4 Mandi Centers, 4 Operators, 8 Farmer Personas, Land Records,
// Bank Accounts, Hourly Slot Capacities, and Initial Sample Queue State.
// ============================================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ----------------------------------------------------------------------------
// 1. Static Master Data Definitions
// ----------------------------------------------------------------------------

export const PROCUREMENT_CENTERS_SEED = [
  {
    id: "center_lud_01",
    centerCode: "MND-LUD-01",
    name: "Ludhiana Central Grain Mandi",
    state: "Punjab",
    district: "Ludhiana",
    address: "GT Road, Near Grain Market Gate 2, Ludhiana, Punjab 141001",
    latitude: 30.9010,
    longitude: 75.8573,
    baysCount: 3,
    activeWorkers: 4,
    maxDailySlots: 45,
    dailyCapacityQtl: 4500.0,
    morningSessionStart: "09:00",
    morningSessionEnd: "13:00",
    afternoonSessionStart: "15:00",
    afternoonSessionEnd: "17:00",
    isActive: true,
  },
  {
    id: "center_gnt_01",
    centerCode: "MND-GNT-01",
    name: "Guntur Agricultural Market Yard",
    state: "Andhra Pradesh",
    district: "Guntur",
    address: "Market Yard Road, Collectorate Area, Guntur, Andhra Pradesh 522004",
    latitude: 16.3067,
    longitude: 80.4365,
    baysCount: 2,
    activeWorkers: 4,
    maxDailySlots: 30,
    dailyCapacityQtl: 3000.0,
    morningSessionStart: "09:00",
    morningSessionEnd: "13:00",
    afternoonSessionStart: "15:00",
    afternoonSessionEnd: "17:00",
    isActive: true,
  },
  {
    id: "center_seh_01",
    centerCode: "MND-SEH-01",
    name: "Sehore Krishi Upaj Mandi",
    state: "Madhya Pradesh",
    district: "Sehore",
    address: "Mandi Campus, Bhopal-Indore Highway, Sehore, Madhya Pradesh 466001",
    latitude: 23.2030,
    longitude: 77.0844,
    baysCount: 2,
    activeWorkers: 4,
    maxDailySlots: 30,
    dailyCapacityQtl: 2800.0,
    morningSessionStart: "09:00",
    morningSessionEnd: "13:00",
    afternoonSessionStart: "15:00",
    afternoonSessionEnd: "17:00",
    isActive: true,
  },
  {
    id: "center_nsk_01",
    centerCode: "MND-NSK-01",
    name: "Nashik Lasalgaon APMC Market",
    state: "Maharashtra",
    district: "Nashik",
    address: "Lasalgaon Station Road, Niphad, Nashik, Maharashtra 422306",
    latitude: 20.1450,
    longitude: 74.2340,
    baysCount: 2,
    activeWorkers: 4,
    maxDailySlots: 30,
    dailyCapacityQtl: 3500.0,
    morningSessionStart: "09:00",
    morningSessionEnd: "13:00",
    afternoonSessionStart: "15:00",
    afternoonSessionEnd: "17:00",
    isActive: true,
  },
];

export const OPERATORS_SEED = [
  {
    id: "op_lud_01",
    centerCode: "MND-LUD-01",
    employeeId: "EMP-LUD-001",
    fullName: "Harpreet Sharma",
    pinCode: "1234",
    phoneNumber: "9814099881",
    role: "OPERATOR",
    isActive: true,
  },
  {
    id: "op_gnt_01",
    centerCode: "MND-GNT-01",
    employeeId: "EMP-GNT-001",
    fullName: "K. Srinivasa Rao",
    pinCode: "1234",
    phoneNumber: "9440188772",
    role: "OPERATOR",
    isActive: true,
  },
  {
    id: "op_seh_01",
    centerCode: "MND-SEH-01",
    employeeId: "EMP-SEH-001",
    fullName: "Dharmendra Verma",
    pinCode: "1234",
    phoneNumber: "9755077663",
    role: "OPERATOR",
    isActive: true,
  },
  {
    id: "op_nsk_01",
    centerCode: "MND-NSK-01",
    employeeId: "EMP-NSK-001",
    fullName: "Ashok Deshmukh",
    pinCode: "1234",
    phoneNumber: "9822066554",
    role: "OPERATOR",
    isActive: true,
  },
];

export const FARMER_PERSONAS_SEED = [
  {
    id: "farmer_001",
    aadhaarNumber: "548912345678",
    maskedAadhaar: "XXXXXXXX5678",
    fullName: "Gurpreet Singh",
    phoneNumber: "9814012345",
    state: "Punjab",
    district: "Ludhiana",
    village: "Rampur",
    languagePreference: "hi",
    bank: {
      bankName: "Punjab National Bank",
      accountNumberMasked: "XXXXXX4512",
      ifscCode: "PUNB0012300",
      pfmsBeneficiaryCode: "PFMS-BEN-548912",
      isAadhaarLinked: true,
    },
    land: {
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
    },
  },
  {
    id: "farmer_002",
    aadhaarNumber: "432187654321",
    maskedAadhaar: "XXXXXXXX4321",
    fullName: "Venkata Ramana",
    phoneNumber: "9440198765",
    state: "Andhra Pradesh",
    district: "Guntur",
    village: "Dharmavaram",
    languagePreference: "te",
    bank: {
      bankName: "State Bank of India",
      accountNumberMasked: "XXXXXX8821",
      ifscCode: "SBIN0004567",
      pfmsBeneficiaryCode: "PFMS-BEN-432187",
      isAadhaarLinked: true,
    },
    land: {
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
    },
  },
  {
    id: "farmer_003",
    aadhaarNumber: "987654321012",
    maskedAadhaar: "XXXXXXXX1012",
    fullName: "Ramesh Patel",
    phoneNumber: "9755011223",
    state: "Madhya Pradesh",
    district: "Sehore",
    village: "Shyampur",
    languagePreference: "hi",
    bank: {
      bankName: "Bank of Baroda",
      accountNumberMasked: "XXXXXX3390",
      ifscCode: "BARB0SEHORE",
      pfmsBeneficiaryCode: "PFMS-BEN-987654",
      isAadhaarLinked: true,
    },
    land: {
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
    },
  },
  {
    id: "farmer_004",
    aadhaarNumber: "876543210987",
    maskedAadhaar: "XXXXXXXX0987",
    fullName: "Savitri Bai",
    phoneNumber: "9822055667",
    state: "Maharashtra",
    district: "Nashik",
    village: "Lasalgaon",
    languagePreference: "hi",
    bank: {
      bankName: "Bank of Maharashtra",
      accountNumberMasked: "XXXXXX7741",
      ifscCode: "MAHB0000321",
      pfmsBeneficiaryCode: "PFMS-BEN-876543",
      isAadhaarLinked: true,
    },
    land: {
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
    },
  },
  {
    id: "farmer_005",
    aadhaarNumber: "765432109876",
    maskedAadhaar: "XXXXXXXX9876",
    fullName: "Balwan Singh",
    phoneNumber: "9416044332",
    state: "Haryana",
    district: "Karnal",
    village: "Gharaunda",
    languagePreference: "hi",
    bank: {
      bankName: "Canara Bank",
      accountNumberMasked: "XXXXXX9912",
      ifscCode: "CNRB0002100",
      pfmsBeneficiaryCode: "PFMS-BEN-765432",
      isAadhaarLinked: true,
    },
    land: {
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
    },
  },
  {
    id: "farmer_006",
    aadhaarNumber: "654321098765",
    maskedAadhaar: "XXXXXXXX8765",
    fullName: "Appa Rao",
    phoneNumber: "9949088776",
    state: "Telangana",
    district: "Warangal",
    village: "Atmakur",
    languagePreference: "te",
    bank: {
      bankName: "Union Bank of India",
      accountNumberMasked: "XXXXXX1154",
      ifscCode: "UBIN0532145",
      pfmsBeneficiaryCode: "PFMS-BEN-654321",
      isAadhaarLinked: true,
    },
    land: {
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
    },
  },
  {
    id: "farmer_007",
    aadhaarNumber: "543210987654",
    maskedAadhaar: "XXXXXXXX7654",
    fullName: "Ram Kumar Maurya",
    phoneNumber: "9450033221",
    state: "Uttar Pradesh",
    district: "Varanasi",
    village: "Pindra",
    languagePreference: "hi",
    bank: {
      bankName: "Central Bank of India",
      accountNumberMasked: "XXXXXX6673",
      ifscCode: "CBIN0281234",
      pfmsBeneficiaryCode: "PFMS-BEN-543210",
      isAadhaarLinked: true,
    },
    land: {
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
    },
  },
  {
    id: "farmer_008",
    aadhaarNumber: "432109876543",
    maskedAadhaar: "XXXXXXXX6543",
    fullName: "Mohan Lal",
    phoneNumber: "9837022114",
    state: "Uttar Pradesh",
    district: "Agra",
    village: "Fatehabad",
    languagePreference: "hi",
    bank: {
      bankName: "State Bank of India",
      accountNumberMasked: "XXXXXX5520",
      ifscCode: "SBIN0001144",
      pfmsBeneficiaryCode: "PFMS-BEN-432109",
      isAadhaarLinked: true,
    },
    land: {
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
    },
  },
];

export const OFFICIAL_CACP_MSP_RATES = {
  WHEAT: { name: "Wheat", ratePerQtl: 2275.0, category: "GRAINS", authority: "CACP" },
  PADDY: { name: "Paddy (Common)", ratePerQtl: 2183.0, category: "GRAINS", authority: "CACP" },
  PADDY_GRADE_A: { name: "Paddy (Grade A)", ratePerQtl: 2203.0, category: "GRAINS", authority: "CACP" },
  CHANA: { name: "Chana (Bengal Gram)", ratePerQtl: 5440.0, category: "PULSES", authority: "CACP" },
  MOONG: { name: "Moong (Green Gram)", ratePerQtl: 8558.0, category: "PULSES", authority: "CACP" },
  ONION: { name: "Onion", ratePerQtl: 1800.0, category: "VEGETABLES_FRUITS", authority: "DOCA_PSF" },
  TOMATO: { name: "Tomato", ratePerQtl: 1500.0, category: "VEGETABLES_FRUITS", authority: "DOCA_PSF" },
  POTATO: { name: "Potato", ratePerQtl: 1200.0, category: "VEGETABLES_FRUITS", authority: "DOCA_PSF" },
};

// ----------------------------------------------------------------------------
// 2. Main Database Seeding Function
// ----------------------------------------------------------------------------

async function main() {
  console.log("🌱 Starting KisanJod Master Data Seeding...");

  // Phase A: Clean existing records in reverse foreign key order
  console.log("🧹 Cleaning existing data records...");
  await prisma.dbtPayment.deleteMany({});
  await prisma.procurementBill.deleteMany({});
  await prisma.queueEvent.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.hourlySlotCapacity.deleteMany({});
  await prisma.operator.deleteMany({});
  await prisma.bankAccount.deleteMany({});
  await prisma.landRecord.deleteMany({});
  await prisma.farmer.deleteMany({});
  await prisma.procurementCenter.deleteMany({});
  console.log("✅ Teardown complete.");

  // Phase B: Seed Procurement Centers
  console.log("🏢 Seeding 4 Mandi Procurement Centres...");
  const centerIdMap: Record<string, string> = {};
  for (const center of PROCUREMENT_CENTERS_SEED) {
    const created = await prisma.procurementCenter.create({
      data: center,
    });
    centerIdMap[center.centerCode] = created.id;
  }
  console.log(`✅ Seeded ${PROCUREMENT_CENTERS_SEED.length} Procurement Centres.`);

  // Phase C: Seed Mandi Operators
  console.log("👷 Seeding 4 Mandi Operator Accounts...");
  for (const op of OPERATORS_SEED) {
    const centerDbId = centerIdMap[op.centerCode];
    if (!centerDbId) {
      throw new Error(`Center code ${op.centerCode} not found for operator ${op.employeeId}`);
    }
    await prisma.operator.create({
      data: {
        id: op.id,
        centerId: centerDbId,
        employeeId: op.employeeId,
        fullName: op.fullName,
        pinCode: op.pinCode,
        phoneNumber: op.phoneNumber,
        role: op.role,
        isActive: op.isActive,
      },
    });
  }
  console.log(`✅ Seeded ${OPERATORS_SEED.length} Operators.`);

  // Phase D: Seed Farmers, Bank Accounts, and Land Records
  console.log("🌾 Seeding 8 Diverse Farmer Personas with Land & Bank Records...");
  for (const persona of FARMER_PERSONAS_SEED) {
    await prisma.farmer.create({
      data: {
        id: persona.id,
        aadhaarNumber: persona.aadhaarNumber,
        maskedAadhaar: persona.maskedAadhaar,
        fullName: persona.fullName,
        phoneNumber: persona.phoneNumber,
        state: persona.state,
        district: persona.district,
        village: persona.village,
        languagePreference: persona.languagePreference,
        bankAccounts: {
          create: {
            bankName: persona.bank.bankName,
            accountNumberMasked: persona.bank.accountNumberMasked,
            ifscCode: persona.bank.ifscCode,
            pfmsBeneficiaryCode: persona.bank.pfmsBeneficiaryCode,
            isAadhaarLinked: persona.bank.isAadhaarLinked,
          },
        },
        landRecords: {
          create: {
            khasraNumber: persona.land.khasraNumber,
            khatauniNumber: persona.land.khatauniNumber,
            village: persona.land.village,
            subDistrictTehsil: persona.land.subDistrictTehsil,
            district: persona.land.district,
            state: persona.land.state,
            totalLandAreaAcres: persona.land.totalLandAreaAcres,
            cropSeason: persona.land.cropSeason,
            verifiedSownCrop: persona.land.verifiedSownCrop,
            sownAreaAcres: persona.land.sownAreaAcres,
            mspProductivityNormQtlPerAcre: persona.land.mspProductivityNormQtlPerAcre,
            maxProcurementQuotaQtl: persona.land.maxProcurementQuotaQtl,
            utilizedQuotaQtl: persona.land.utilizedQuotaQtl,
          },
        },
      },
    });
  }
  console.log(`✅ Seeded ${FARMER_PERSONAS_SEED.length} Farmer Personas.`);

  // Phase E: Seed Hourly Slot Capacities for Today and Tomorrow
  console.log("⏱️ Seeding Hourly Slot Capacities for Mandi Bays (08:00 - 17:00)...");
  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const datesToSeed = [todayStr, tomorrowStr];
  let capacityRecordsCount = 0;

  const capacityRecords = [];
  const capacityRecords: Array<{
    centerId: string;
    date: string;
    hourOfDay: number;
    bookedCount: number;
    maxCapacity: number;
  }> = [];

  for (const center of PROCUREMENT_CENTERS_SEED) {
    const centerDbId = centerIdMap[center.centerCode];
    for (const dateStr of datesToSeed) {
      for (let hour = 8; hour <= 17; hour++) {
        // Standard capacity: 8 slots per hour for 4-worker mandi team
        const maxCapacity = (center.activeWorkers || 4) * 2;
        await prisma.hourlySlotCapacity.create({
          data: {
            centerId: centerDbId,
            date: dateStr,
            hourOfDay: hour,
            bookedCount: 0,
            maxCapacity: maxCapacity,
          },
        capacityRecords.push({
          centerId: centerDbId,
          date: dateStr,
          hourOfDay: hour,
          bookedCount: 0,
          maxCapacity: maxCapacity,
        });
        capacityRecordsCount++;
      }
    }
  }
  console.log(`✅ Seeded ${capacityRecordsCount} Hourly Slot Capacity Records.`);
  await prisma.hourlySlotCapacity.createMany({ data: capacityRecords });
  console.log(`✅ Seeded ${capacityRecords.length} Hourly Slot Capacity Records.`);

  // Phase F: Seed Sample Initial Queue State (Live Verification Fixtures)
  console.log("🎯 Seeding Initial Live Verification Fixtures (Completed Bill & Active Queue)...");
  const ludhianaCenterId = centerIdMap["MND-LUD-01"];
  const ludhianaOperator = await prisma.operator.findUnique({
    where: { employeeId: "EMP-LUD-001" },
  });

  if (ludhianaCenterId && ludhianaOperator) {
    // 1. Completed Booking with J-Form and Credited DBT Payment for Gurpreet Singh
    const booking1 = await prisma.booking.create({
      data: {
        id: "booking_seed_001",
        bookingNumber: "BK-2026-LUD-001",
        tokenNumber: "M-001",
        farmerId: "farmer_001",
        centerId: ludhianaCenterId,
        cropName: "Wheat",
        commodityCategory: "GRAINS",
        unitType: "GUNNY_BAG_50KG",
        packageCount: 100,
        estimatedQuantityQtl: 50.0,
        bookedDate: todayStr,
        scheduledSlotStart: "08:30",
        scheduledSlotEnd: "09:00",
        dynamicEta: "08:30",
        delayMinutes: 0,
        status: "COMPLETED",
        sessionName: "MORNING",
        queueEvents: {
          createMany: {
            data: [
              {
                eventType: "SLOT_CONFIRMED",
                description: "Slot booked for 50.00 Qtl Wheat (Morning Session)",
                triggeredBy: "SYSTEM",
              },
              {
                eventType: "CALLED_TO_BAY",
                description: "Token M-001 called for weighment",
                triggeredBy: "OPERATOR",
              },
              {
                eventType: "COMPLETED",
                description: "Weighment completed: Net 50.00 Qtl, Grade FAQ",
                triggeredBy: "OPERATOR",
              },
            ],
          },
        },
      },
    });

    // Create statutory J-Form bill (50 Qtl * ₹2,275 = ₹1,13,750.00)
    const bill1 = await prisma.procurementBill.create({
      data: {
        id: "bill_seed_001",
        billNumber: "JF-2026-LUD01-00101",
        bookingId: booking1.id,
        centerId: ludhianaCenterId,
        operatorId: ludhianaOperator.id,
        farmerId: "farmer_001",
        cropName: "Wheat",
        qualityGrade: "FAQ",
        measuredMoisturePct: 11.4,
        grossWeightQtl: 72.5,
        tareWeightQtl: 22.5,
        netWeightQtl: 50.0,
        notifiedMspRate: 2275.0,
        grossAmountPayable: 113750.0,
        deductionsAmount: 0.0,
        netAmountPayable: 113750.0,
        digitalSealHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        qrPayload: "https://doca.gov.in/verify/JF-2026-LUD01-00101",
      },
    });

    // Create credited DBT Payment
    await prisma.dbtPayment.create({
      data: {
        id: "dbt_seed_001",
        billId: bill1.id,
        pfmsReferenceNumber: "PFMS-2026-DOCA-LUD01-00101",
        status: "CREDITED",
        beneficiaryMaskedAc: "XXXXXX4512",
        bankIfsc: "PUNB0012300",
        bankName: "Punjab National Bank",
        bankUtr: "PUNBH26251098765",
        amountInr: 113750.0,
        disbursementDate: new Date(),
        creditedAt: new Date(),
      },
    });

    // 2. Waiting Booking for Balwan Singh (TK-002)
    // 2. Waiting Booking for Balwan Singh (M-002)
    await prisma.booking.create({
      data: {
        id: "booking_seed_002",
        bookingNumber: "BK-2026-LUD-002",
        tokenNumber: "M-002",
        farmerId: "farmer_005",
        centerId: ludhianaCenterId,
        cropName: "Wheat",
        commodityCategory: "GRAINS",
        unitType: "GUNNY_BAG_50KG",
        packageCount: 100,
        estimatedQuantityQtl: 50.0,
        bookedDate: todayStr,
        scheduledSlotStart: "09:00",
        scheduledSlotEnd: "09:30",
        dynamicEta: "09:00",
        delayMinutes: 0,
        status: "WAITING",
        sessionName: "MORNING",
        queueEvents: {
          create: {
            eventType: "SLOT_CONFIRMED",
            description: "Slot booked for 50.00 Qtl Wheat. Position #1 in Morning waiting queue.",
            triggeredBy: "SYSTEM",
          },
        },
      },
    });

    // Update hourly booked count
    await prisma.hourlySlotCapacity.updateMany({
      where: {
        centerId: ludhianaCenterId,
        date: todayStr,
        hourOfDay: 8,
      },
      data: { bookedCount: 1 },
    });
    await prisma.hourlySlotCapacity.updateMany({
      where: {
        centerId: ludhianaCenterId,
        date: todayStr,
        hourOfDay: 9,
      },
      data: { bookedCount: 1 },
    });

    console.log("✅ Seeded verification fixtures: TK-001 (Completed + DBT Credited), TK-002 (Waiting).");
  }

  console.log("🎉 KisanJod database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

