// ============================================================================
// KisanJod - Standalone High-Performance In-Memory & Deterministic Store
// Department of Consumer Affairs (DoCA), Ministry of Consumer Affairs, Food & Public Distribution
// 100% Standalone Self-Contained Engine — Zero Cloud Database Dependencies
// ============================================================================

import { ALL_PROCUREMENT_CENTRES, MockProcurementCentre } from "@/lib/mocks/procurementCentres";
import { CROP_CATALOG, CropCommodityInfo } from "@/lib/mocks/agmarknet";
import { PM_KISAN_DATABASE, MockFarmerRecord, MockLandHolding } from "@/lib/mocks/pmkisan";
import pfmsMock from "@/lib/mocks/pfms";
import { notifySync } from "@/lib/syncBus";
import { timeToMinutes, minutesToTimeStr } from "@/lib/timeFormat";
import crypto from "crypto";

export interface StandaloneOperator {
  id: string;
  employeeId: string;
  fullName: string;
  pinCode: string;
  role: "OPERATOR" | "SUPERVISOR";
  centerId: string;
  center: {
    id: string;
    name: string;
    centerCode: string;
    district: string;
    state: string;
  };
}

export interface StandaloneDbtPayment {
  id: string;
  pfmsReferenceNumber: string;
  amountInr: number;
  status: "PROCESSING" | "CREDITED" | "FAILED";
  bankUtrNumber?: string;
  accountNumberMasked: string;
  ifscCode: string;
  bankName: string;
  creditTimestamp?: string;
}

export interface StandaloneProcurementBill {
  id: string;
  billNumber: string;
  bookingId: string;
  farmerId: string;
  centerId: string;
  cropName: string;
  grossWeightQtl: number;
  tareWeightQtl: number;
  netWeightQtl: number;
  notifiedMspRate: number;
  qualityGrade: "FAQ" | "GRADE_A";
  moisturePercentage: number;
  netAmountPayable: number;
  digitalSealHash: string;
  createdAt: string;
  dbtPayment?: StandaloneDbtPayment;
}

export interface StandaloneBooking {
  id: string;
  bookingNumber: string;
  tokenNumber: string;
  farmerId: string;
  farmerName: string;
  centerId: string;
  cropName: string;
  commodityCategory: string;
  unitType: "GUNNY_BAG_50KG" | "CRATE_25KG" | "QUINTALS";
  packageCount: number;
  estimatedQuantityQtl: number;
  bookedDate: string; // YYYY-MM-DD
  scheduledSlotStart: string; // HH:mm
  scheduledSlotEnd: string; // HH:mm
  dynamicEta: string; // HH:mm
  delayMinutes: number;
  status: "WAITING" | "CALLED" | "AT_BAY" | "STANDBY" | "COMPLETED" | "CANCELLED";
  bayAssigned: number;
  sessionName: "MORNING" | "AFTERNOON";
  createdAt: string;
  center: {
    id: string;
    name: string;
    district: string;
    state: string;
  };
  procurementBill?: StandaloneProcurementBill;
}

interface StoreState {
  operators: Map<string, StandaloneOperator>;
  bookings: Map<string, StandaloneBooking>;
  bills: Map<string, StandaloneProcurementBill>;
  centres: Map<string, any>;
  initialized: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __kisanjodStandaloneStore: StoreState | undefined;
}

function getStore(): StoreState {
  if (!globalThis.__kisanjodStandaloneStore) {
    globalThis.__kisanjodStandaloneStore = {
      operators: new Map(),
      bookings: new Map(),
      bills: new Map(),
      centres: new Map(),
      initialized: false,
    };
  }
  return globalThis.__kisanjodStandaloneStore;
}

function getISTDateString(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

/**
 * Initializes the standalone store with realistic baseline seeds
 */
export function ensureStoreInitialized(): StoreState {
  const store = getStore();
  if (store.initialized) return store;

  // 0. Seed Centres from ALL_PROCUREMENT_CENTRES
  ALL_PROCUREMENT_CENTRES.forEach((c) => {
    store.centres.set(c.id, {
      id: c.id,
      centerCode: c.id.toUpperCase().replace("CENTER_", "MND-"),
      name: c.name,
      state: c.state,
      district: c.district,
      address: `${c.address}, ${c.state} ${c.pinCode}`,
      baysCount: c.activeWorkers > 4 ? 3 : 2,
      maxDailySlots: Math.floor(c.maxDailyCapacity / 100),
      dailyCapacityQtl: c.maxDailyCapacity,
      isActive: c.isActive,
      activeWorkers: c.activeWorkers,
      morningSessionStart: c.morningSessionStart,
      morningSessionEnd: c.morningSessionEnd,
      afternoonSessionStart: c.afternoonSessionStart,
      afternoonSessionEnd: c.afternoonSessionEnd,
      eveningSessionEnabled: false,
      eveningSessionStart: "19:00",
      eveningSessionEnd: "23:00",
    });
  });

  // 1. Seed Operators across primary APMC mandis
  const primaryCentres = ALL_PROCUREMENT_CENTRES.slice(0, 10);
  primaryCentres.forEach((c, idx) => {
    const empId = idx === 0 ? "EMP-LUD-001" : idx === 1 ? "EMP-GUN-001" : `EMP-${c.district.slice(0, 3).toUpperCase()}-${String(idx + 1).padStart(3, "0")}`;
    const op: StandaloneOperator = {
      id: `op_${c.id}`,
      employeeId: empId,
      fullName: idx === 0 ? "Harpreet Sharma" : idx === 1 ? "Siva Rama Krishna" : `Mandi Operator ${c.district}`,
      pinCode: "1234",
      role: "OPERATOR",
      centerId: c.id,
      center: {
        id: c.id,
        name: c.name,
        centerCode: `MND-${c.id.toUpperCase()}`,
        district: c.district,
        state: c.state,
      },
    };
    store.operators.set(empId, op);
  });

  const today = getISTDateString();

  // 2. Seed Baseline Historical Procurement Bill & Completed Booking for Gurpreet Singh
  const seedBillId = "bill_seed_001";
  const seedBookingId = "booking_seed_001";

  const seedDbt: StandaloneDbtPayment = {
    id: "dbt_seed_001",
    pfmsReferenceNumber: "PFMS-2026-DOCA-93805",
    amountInr: 113750,
    status: "CREDITED",
    bankUtrNumber: "UTR446290000001",
    accountNumberMasked: "XXXXXX4512",
    ifscCode: "PUNB0012300",
    bankName: "Punjab National Bank",
    creditTimestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
  };

  const seedBill: StandaloneProcurementBill = {
    id: seedBillId,
    billNumber: "JF-2026-LUD01-00101",
    bookingId: seedBookingId,
    farmerId: "farmer_001",
    centerId: "center_lud_01",
    cropName: "Wheat",
    grossWeightQtl: 62.5,
    tareWeightQtl: 12.5,
    netWeightQtl: 50.0,
    notifiedMspRate: 2275.0,
    qualityGrade: "FAQ",
    moisturePercentage: 11.4,
    netAmountPayable: 113750.0,
    digitalSealHash: "b07fce4287e9ac15d84a7e934789fae155bc8129e92a8385",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    dbtPayment: seedDbt,
  };
  store.bills.set(seedBillId, seedBill);

  const seedCompletedBooking: StandaloneBooking = {
    id: seedBookingId,
    bookingNumber: "BK-2026-LUD-001",
    tokenNumber: "M-001",
    farmerId: "farmer_001",
    farmerName: "Gurpreet Singh",
    centerId: "center_lud_01",
    cropName: "Wheat",
    commodityCategory: "GRAINS",
    unitType: "GUNNY_BAG_50KG",
    packageCount: 100,
    estimatedQuantityQtl: 50.0,
    bookedDate: today,
    scheduledSlotStart: "08:00",
    scheduledSlotEnd: "08:30",
    dynamicEta: "08:00",
    delayMinutes: 0,
    status: "COMPLETED",
    bayAssigned: 1,
    sessionName: "MORNING",
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    center: {
      id: "center_lud_01",
      name: "Ludhiana Central Grain Mandi",
      district: "Ludhiana",
      state: "Punjab",
    },
    procurementBill: seedBill,
  };
  store.bookings.set(seedBookingId, seedCompletedBooking);

  // 3. Seed Baseline Active Waiting Queue for Today at Ludhiana Mandi
  const sampleWaiting: Array<{
    id: string;
    token: string;
    fId: string;
    fName: string;
    crop: string;
    bags: number;
    qtl: number;
    start: string;
    end: string;
    status: "WAITING" | "CALLED";
  }> = [
    {
      id: "booking_active_001",
      token: "M-002",
      fId: "farmer_001",
      fName: "Gurpreet Singh",
      crop: "Wheat",
      bags: 40,
      qtl: 20.0,
      start: "08:30",
      end: "09:00",
      status: "CALLED",
    },
    {
      id: "booking_active_002",
      token: "M-003",
      fId: "farmer_005",
      fName: "Balwan Singh",
      crop: "Paddy",
      bags: 60,
      qtl: 30.0,
      start: "09:00",
      end: "09:30",
      status: "WAITING",
    },
    {
      id: "booking_active_003",
      token: "M-004",
      fId: "farmer_008",
      fName: "Mohan Lal",
      crop: "Wheat",
      bags: 50,
      qtl: 25.0,
      start: "09:30",
      end: "10:00",
      status: "WAITING",
    },
  ];

  sampleWaiting.forEach((s) => {
    const b: StandaloneBooking = {
      id: s.id,
      bookingNumber: `BK-2026-LUD-${s.token.replace("-", "")}`,
      tokenNumber: s.token,
      farmerId: s.fId,
      farmerName: s.fName,
      centerId: "center_lud_01",
      cropName: s.crop,
      commodityCategory: "GRAINS",
      unitType: "GUNNY_BAG_50KG",
      packageCount: s.bags,
      estimatedQuantityQtl: s.qtl,
      bookedDate: today,
      scheduledSlotStart: s.start,
      scheduledSlotEnd: s.end,
      dynamicEta: s.start,
      delayMinutes: 0,
      status: s.status,
      bayAssigned: 1,
      sessionName: "MORNING",
      createdAt: new Date().toISOString(),
      center: {
        id: "center_lud_01",
        name: "Ludhiana Central Grain Mandi",
        district: "Ludhiana",
        state: "Punjab",
      },
    };
    store.bookings.set(s.id, b);
  });

  store.initialized = true;
  return store;
}

// ----------------------------------------------------------------------------
// Public Store Methods
// ----------------------------------------------------------------------------

export const standaloneStore = {
  // Centre Directory & Settings
  getCentres(filter?: { state?: string; district?: string }) {
    const store = ensureStoreInitialized();
    let list = Array.from(store.centres.values());
    if (filter?.state) {
      const s = filter.state.toLowerCase();
      list = list.filter((c) => c.state.toLowerCase() === s);
    }
    if (filter?.district) {
      const d = filter.district.toLowerCase();
      list = list.filter((c) => c.district.toLowerCase().includes(d));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  },

  getCentreById(centreId: string) {
    const store = ensureStoreInitialized();
    return store.centres.get(centreId) || null;
  },

  updateCentre(centreId: string, updates: Record<string, any>) {
    const store = ensureStoreInitialized();
    const existing = store.centres.get(centreId);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    store.centres.set(centreId, updated);
    return updated;
  },

  getCentreActiveBookings(centreId: string, date: string): StandaloneBooking[] {
    const store = ensureStoreInitialized();
    const list: StandaloneBooking[] = [];
    for (const b of store.bookings.values()) {
      if (b.centerId === centreId && b.bookedDate === date && b.status !== "CANCELLED") {
        list.push(b);
      }
    }
    return list.sort((a, b) => a.scheduledSlotStart.localeCompare(b.scheduledSlotStart));
  },

  // Operator Authentication
  authenticateOperator(employeeId: string, pin: string): StandaloneOperator | null {
    const store = ensureStoreInitialized();
    const op = store.operators.get(employeeId.trim().toUpperCase());
    if (!op || op.pinCode !== pin) return null;
    return op;
  },

  getOperatorById(operatorId: string): StandaloneOperator | null {
    const store = ensureStoreInitialized();
    for (const op of store.operators.values()) {
      if (op.id === operatorId) return op;
    }
    return null;
  },

  // Farmer Bookings
  getFarmerBookings(farmerId: string): StandaloneBooking[] {
    const store = ensureStoreInitialized();
    const list: StandaloneBooking[] = [];
    for (const b of store.bookings.values()) {
      if (b.farmerId === farmerId) {
        list.push(b);
      }
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getBookingById(bookingId: string): StandaloneBooking | null {
    const store = ensureStoreInitialized();
    return store.bookings.get(bookingId) || null;
  },

  // Live Queue for Mandi Centre
  getQueueForCentre(centreId: string, date?: string) {
    const store = ensureStoreInitialized();
    const targetDate = date || getISTDateString();

    const bookings: StandaloneBooking[] = [];
    for (const b of store.bookings.values()) {
      if (b.centerId === centreId && b.bookedDate === targetDate) {
        bookings.push(b);
      }
    }

    bookings.sort((a, b) => a.tokenNumber.localeCompare(b.tokenNumber));

    const called = bookings.filter((b) => b.status === "AT_BAY" || b.status === "CALLED");
    const currentlyServing = called[0] || null;
    const waiting = bookings.filter((b) => b.status === "WAITING");
    const completed = bookings.filter((b) => b.status === "COMPLETED");
    const standby = bookings.filter((b) => b.status === "STANDBY");

    return {
      centreId,
      date: targetDate,
      currentlyServing: currentlyServing
        ? {
            id: currentlyServing.id,
            tokenNumber: currentlyServing.tokenNumber,
            farmerName: currentlyServing.farmerName,
            cropName: currentlyServing.cropName,
            status: currentlyServing.status,
            sessionName: currentlyServing.sessionName,
            bayAssigned: currentlyServing.bayAssigned || 1,
          }
        : null,
      calledQueue: called.map((b) => ({
        id: b.id,
        tokenNumber: b.tokenNumber,
        farmerName: b.farmerName,
        cropName: b.cropName,
        status: b.status,
        sessionName: b.sessionName,
        bayAssigned: b.bayAssigned || 1,
      })),
      waitingQueue: waiting.map((b) => ({
        id: b.id,
        tokenNumber: b.tokenNumber,
        farmerName: b.farmerName,
        cropName: b.cropName,
        packageCount: b.packageCount,
        estimatedQtl: b.estimatedQuantityQtl,
        scheduledSlot: `${b.scheduledSlotStart} - ${b.scheduledSlotEnd}`,
        dynamicEta: b.dynamicEta,
        delayMinutes: b.delayMinutes,
      })),
      standbyQueue: standby.map((b) => ({
        id: b.id,
        tokenNumber: b.tokenNumber,
        farmerName: b.farmerName,
      })),
      completedCount: completed.length,
      totalBooked: bookings.length,
    };
  },

  // Create Booking
  createBooking(params: {
    farmerId: string;
    centerId: string;
    cropName: string;
    commodityCategory?: string;
    unitType?: string;
    packageCount: number;
    capacityKg?: number;
    date: string;
    hourOfDay?: number;
    startTime?: string;
    endTime?: string;
    bayAssigned?: number;
    sessionName?: string;
    rescheduleBookingId?: string;
  }) {
    const store = ensureStoreInitialized();
    const {
      farmerId,
      centerId,
      cropName,
      packageCount,
      capacityKg,
      date,
      startTime,
      endTime,
      sessionName,
      unitType,
      rescheduleBookingId,
    } = params;

    // 1. Resolve Farmer Persona
    const farmersList = Object.values(PM_KISAN_DATABASE);
    const farmer =
      farmersList.find(
        (f: MockFarmerRecord) =>
          f.farmerRegistrationId === farmerId || f.aadhaarNumber.endsWith(farmerId.replace("farmer_", ""))
      ) || farmersList[0];

    // 2. Active 3-Booking Boundary Constraint
    const activeBookings = Array.from(store.bookings.values()).filter(
      (b) =>
        b.farmerId === farmerId &&
        ["WAITING", "CALLED", "AT_BAY", "STANDBY"].includes(b.status) &&
        (!rescheduleBookingId || b.id !== rescheduleBookingId)
    );

    if (activeBookings.length >= 3) {
      return {
        success: false,
        status: 400,
        errorType: "ACTIVE_SLOT_LIMIT_EXCEEDED",
        error:
          "Active Booking Limit Reached: You currently have 3 active delivery tokens scheduled. APMC guidelines permit a maximum of 3 concurrent active bookings per farmer to ensure fair queue opportunities for everyone.",
        details: { activeBookingsCount: activeBookings.length, maxAllowed: 3 },
      };
    }

    // 2b. Same-Day Multi-Centre Conflict
    const sameDayBooking = activeBookings.find(
      (b) => b.bookedDate === date && b.centerId !== centerId
    );
    if (sameDayBooking) {
      const centreName = sameDayBooking.center?.name || sameDayBooking.centerId;
      return {
        success: false,
        status: 400,
        errorType: "SAME_DAY_CONFLICT",
        error: `Scheduling Conflict: You already hold active Token ${sameDayBooking.tokenNumber} at ${centreName} on ${date}. Mandi regulations permit one procurement centre delivery per farmer per day to prevent highway congestion and maintain fair gate entry. Please pick a different date or manage your existing booking.`,
        conflictDetails: {
          tokenNumber: sameDayBooking.tokenNumber,
          centreName,
          date,
          bookingId: sameDayBooking.id,
        },
      };
    }

    // 3. Resolve Crop & Capacity
    const crop = CROP_CATALOG.find(
      (c) => c.nameEn.toLowerCase() === cropName.toLowerCase() || c.commodityKey.toLowerCase() === cropName.toLowerCase()
    ) || CROP_CATALOG[0];

    const resolvedUnitType = (unitType || crop.standardPackaging) as "GUNNY_BAG_50KG" | "CRATE_25KG" | "QUINTALS";
    const kgPerUnit = capacityKg && capacityKg > 0 ? capacityKg : resolvedUnitType === "CRATE_25KG" ? 25 : 50;
    const estimatedQtl = parseFloat(((packageCount * kgPerUnit) / 100).toFixed(2));

    // 4. Land Quota Check
    const landRecord = farmer.landHoldings.find((l: MockLandHolding) => l.verifiedSownCrop.toLowerCase() === crop.nameEn.toLowerCase()) || farmer.landHoldings[0];
    const totalQuota = landRecord?.maxProcurementQuotaQtl || 100.0;
    const utilizedQuota = landRecord?.utilizedQuotaQtl || 0.0;

    const currentBookedQtl = activeBookings
      .filter((b) => b.cropName.toLowerCase() === crop.nameEn.toLowerCase())
      .reduce((sum, b) => sum + b.estimatedQuantityQtl, 0);

    const remainingQuota = Math.max(0, parseFloat((totalQuota - utilizedQuota - currentBookedQtl).toFixed(2)));

    if (estimatedQtl > remainingQuota) {
      const maxAllowedPackages = Math.floor((remainingQuota * 100) / kgPerUnit);
      return {
        success: false,
        status: 400,
        errorType: "QUOTA_EXCEEDED",
        error: `Your requested delivery of ${estimatedQtl.toFixed(1)} Qtl exceeds your remaining verified ${crop.nameEn} quota of ${remainingQuota.toFixed(1)} Qtl. Please adjust your booking to ${remainingQuota.toFixed(1)} Qtl (${maxAllowedPackages} packages) or less.`,
        quotaDetails: {
          requestedQtl: estimatedQtl,
          totalQuotaQtl: totalQuota,
          utilizedQuotaQtl: utilizedQuota,
          currentBookedQtl,
          remainingQuotaQtl: remainingQuota,
          maxAllowedPackages,
          verifiedCrop: crop.nameEn,
          khasraNumber: landRecord?.khasraNumber || "142/1",
        },
      };
    }

    // 5. Generate Sequential Token
    const resolvedSession = sessionName === "AFTERNOON" ? "AFTERNOON" : "MORNING";
    const prefix = resolvedSession === "MORNING" ? "M" : "A";

    const sessionBookings = Array.from(store.bookings.values()).filter(
      (b) => b.centerId === centerId && b.bookedDate === date && b.sessionName === resolvedSession
    );

    let maxSeq = 0;
    sessionBookings.forEach((b) => {
      if (b.tokenNumber.startsWith(`${prefix}-`)) {
        const seq = parseInt(b.tokenNumber.split("-")[1], 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    });

    const tokenNumber = `${prefix}-${String(maxSeq + 1).padStart(3, "0")}`;
    const bookingId = `booking_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const bookingNumber = `BK-${new Date().getFullYear()}-${centerId.slice(-6).toUpperCase()}-${String(maxSeq + 1).padStart(3, "0")}`;

    // Resolve Centre Info
    const centreObj = ALL_PROCUREMENT_CENTRES.find((c) => c.id === centerId) || {
      id: centerId,
      name: "Agricultural Produce Market Committee",
      district: "Local District",
      state: "Local State",
    };

    // If rescheduling, cancel previous booking
    if (rescheduleBookingId && store.bookings.has(rescheduleBookingId)) {
      const old = store.bookings.get(rescheduleBookingId)!;
      old.status = "CANCELLED";
    }

    const scheduledStart = startTime || (resolvedSession === "MORNING" ? "09:00" : "14:00");
    const scheduledEnd = endTime || (resolvedSession === "MORNING" ? "09:30" : "14:30");

    const newBooking: StandaloneBooking = {
      id: bookingId,
      bookingNumber,
      tokenNumber,
      farmerId,
      farmerName: farmer.fullName,
      centerId,
      cropName: crop.nameEn,
      commodityCategory: crop.category,
      unitType: resolvedUnitType,
      packageCount,
      estimatedQuantityQtl: estimatedQtl,
      bookedDate: date,
      scheduledSlotStart: scheduledStart,
      scheduledSlotEnd: scheduledEnd,
      dynamicEta: scheduledStart,
      delayMinutes: 0,
      status: "WAITING",
      bayAssigned: 1,
      sessionName: resolvedSession,
      createdAt: new Date().toISOString(),
      center: {
        id: centreObj.id,
        name: centreObj.name,
        district: centreObj.district,
        state: centreObj.state,
      },
    };

    store.bookings.set(bookingId, newBooking);

    notifySync({
      type: "BOOKING_CREATED",
      centerId,
      farmerId,
      bookingId,
      tokenNumber,
    });

    return {
      success: true,
      status: 200,
      booking: newBooking,
    };
  },

  // Cancel Booking
  cancelBooking(bookingId: string) {
    const store = ensureStoreInitialized();
    const b = store.bookings.get(bookingId);
    if (!b) return { success: false, error: "Booking not found", status: 404 };

    b.status = "CANCELLED";

    // Auto-advance downstream waiting tokens in same center, date and session
    try {
      const cancelledStartMin = timeToMinutes(b.scheduledSlotStart);
      const cancelledEndMin = timeToMinutes(b.scheduledSlotEnd);
      const freedMinutes = Math.max(15, cancelledEndMin - cancelledStartMin);

      for (const downstream of store.bookings.values()) {
        if (
          downstream.centerId === b.centerId &&
          downstream.bookedDate === b.bookedDate &&
          downstream.sessionName === b.sessionName &&
          downstream.status === "WAITING" &&
          downstream.id !== b.id
        ) {
          const currentEtaMin = timeToMinutes(downstream.dynamicEta || downstream.scheduledSlotStart);
          if (currentEtaMin >= cancelledEndMin) {
            const newEtaMin = Math.max(cancelledStartMin, currentEtaMin - freedMinutes);
            downstream.dynamicEta = minutesToTimeStr(newEtaMin);
          }
        }
      }
    } catch (e) {
      console.error("Downstream queue advance error:", e);
    }

    notifySync({
      type: "BOOKING_CANCELLED",
      centerId: b.centerId,
      farmerId: b.farmerId,
      bookingId: b.id,
      tokenNumber: b.tokenNumber,
    });

    return {
      success: true,
      status: 200,
      message: `Booking ${b.tokenNumber} cancelled successfully`,
      booking: b,
    };
  },

  // Operator: Call Next
  callNext(centerId: string, date?: string) {
    const store = ensureStoreInitialized();
    const targetDate = date || getISTDateString();

    const waiting = Array.from(store.bookings.values())
      .filter((b) => b.centerId === centerId && b.bookedDate === targetDate && b.status === "WAITING")
      .sort((a, b) => a.tokenNumber.localeCompare(b.tokenNumber));

    if (waiting.length === 0) {
      return { success: false, error: "No farmers waiting in queue", status: 404 };
    }

    const next = waiting[0];
    next.status = "CALLED";

    notifySync({
      type: "QUEUE_CALL",
      centerId,
      farmerId: next.farmerId,
      bookingId: next.id,
      tokenNumber: next.tokenNumber,
    });

    return {
      success: true,
      status: 200,
      token: next.tokenNumber,
      statusStr: "CALLED",
      booking: next,
    };
  },

  // Operator: Put on Standby
  putStandby(bookingId: string) {
    const store = ensureStoreInitialized();
    const b = store.bookings.get(bookingId);
    if (!b) return { success: false, error: "Booking not found", status: 404 };

    b.status = "STANDBY";

    notifySync({
      type: "QUEUE_STANDBY",
      centerId: b.centerId,
      farmerId: b.farmerId,
      bookingId: b.id,
      tokenNumber: b.tokenNumber,
    });

    return { success: true, status: 200, booking: b };
  },

  // Operator: Resume Standby
  resumeStandby(bookingId: string) {
    const store = ensureStoreInitialized();
    const b = store.bookings.get(bookingId);
    if (!b) return { success: false, error: "Booking not found", status: 404 };

    b.status = "WAITING";

    notifySync({
      type: "QUEUE_RESUMED",
      centerId: b.centerId,
      farmerId: b.farmerId,
      bookingId: b.id,
      tokenNumber: b.tokenNumber,
    });

    return { success: true, status: 200, booking: b };
  },

  // Operator: Complete Weighment & Generate J-Form + DBT Payment
  completeWeighment(params: {
    bookingId: string;
    grossWeightQtl: number;
    tareWeightQtl: number;
    grade: "FAQ" | "GRADE_A";
    moisture: number;
    operatorId?: string;
  }) {
    const store = ensureStoreInitialized();
    const { bookingId, grossWeightQtl, tareWeightQtl, grade, moisture } = params;

    const b = store.bookings.get(bookingId);
    if (!b) return { success: false, error: "Booking not found", status: 404 };

    const netWeightQtl = Math.max(0.1, parseFloat((grossWeightQtl - tareWeightQtl).toFixed(2)));

    // Resolve MSP rate
    const crop = CROP_CATALOG.find(
      (c) => c.nameEn.toLowerCase() === b.cropName.toLowerCase() || c.commodityKey.toLowerCase() === b.cropName.toLowerCase()
    ) || CROP_CATALOG[0];

    const mspRate = crop.notifiedMspPerQtl || 2275.0;
    const netAmountPayable = Math.round(netWeightQtl * mspRate);

    const billId = `bill_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const billNumber = `JF-2026-${b.centerId.slice(-5).toUpperCase()}-${b.tokenNumber.replace("-", "")}`;
    const sealHash = crypto.createHash("sha256").update(`${billNumber}-${b.farmerId}-${netAmountPayable}`).digest("hex");

    // Farmer bank account resolution
    const farmersList = Object.values(PM_KISAN_DATABASE);
    const farmer =
      farmersList.find(
        (f: MockFarmerRecord) =>
          f.farmerRegistrationId === b.farmerId || f.aadhaarNumber.endsWith(b.farmerId.replace("farmer_", ""))
      ) || farmersList[0];

    // DBT Payment Record
    const dbtPayment: StandaloneDbtPayment = {
      id: `dbt_${Date.now()}`,
      pfmsReferenceNumber: `PFMS-2026-DOCA-${Math.floor(10000 + Math.random() * 90000)}`,
      amountInr: netAmountPayable,
      status: "CREDITED",
      bankUtrNumber: `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      accountNumberMasked: farmer.bankDetails.accountNumberMasked,
      ifscCode: farmer.bankDetails.ifscCode,
      bankName: farmer.bankDetails.bankName,
      creditTimestamp: new Date().toISOString(),
    };

    const bill: StandaloneProcurementBill = {
      id: billId,
      billNumber,
      bookingId: b.id,
      farmerId: b.farmerId,
      centerId: b.centerId,
      cropName: b.cropName,
      grossWeightQtl,
      tareWeightQtl,
      netWeightQtl,
      notifiedMspRate: mspRate,
      qualityGrade: grade,
      moisturePercentage: moisture,
      netAmountPayable,
      digitalSealHash: sealHash,
      createdAt: new Date().toISOString(),
      dbtPayment,
    };

    store.bills.set(billId, bill);

    b.status = "COMPLETED";
    b.procurementBill = bill;

    notifySync({
      type: "WEIGHMENT_COMPLETED",
      centerId: b.centerId,
      farmerId: b.farmerId,
      bookingId: b.id,
      tokenNumber: b.tokenNumber,
      billNumber,
    });

    return {
      success: true,
      status: 200,
      bill,
      booking: b,
    };
  },

  // DoCA Admin Telemetry Statistics
  getAdminStats() {
    const store = ensureStoreInitialized();
    const today = getISTDateString();

    const allBookings = Array.from(store.bookings.values());
    const allBills = Array.from(store.bills.values());

    const totalBookings = allBookings.length;
    const todayBookings = allBookings.filter((b) => b.bookedDate === today).length;
    const completedBookings = allBookings.filter((b) => b.status === "COMPLETED").length;
    const waitingBookings = allBookings.filter((b) => b.status === "WAITING" || b.status === "CALLED" || b.status === "AT_BAY").length;

    const totalProcuredQtl = allBills.reduce((sum, bill) => sum + bill.netWeightQtl, 0);
    const totalAmountInr = allBills.reduce((sum, bill) => sum + bill.netAmountPayable, 0);

    // Group active centres
    const centreStats = ALL_PROCUREMENT_CENTRES.slice(0, 15).map((c) => {
      const cBookings = allBookings.filter((b) => b.centerId === c.id);
      const cToday = cBookings.filter((b) => b.bookedDate === today);
      const todayWaiting = cToday.filter((b) => b.status === "WAITING" || b.status === "CALLED").length;
      const todayCompleted = cToday.filter((b) => b.status === "COMPLETED").length;
      const maxDailySlots = 30;

      return {
        name: c.name,
        district: c.district,
        totalBookings: cBookings.length,
        todayWaiting,
        todayCompleted,
        todayTotal: cToday.length,
        maxDailySlots,
        utilization: Math.min(100, Math.round((cToday.length / maxDailySlots) * 100)),
      };
    });

    return {
      overview: {
        totalBookings,
        todayBookings,
        completedBookings,
        waitingBookings,
        totalProcuredQtl: parseFloat(totalProcuredQtl.toFixed(1)),
        totalAmountInr,
        billsGenerated: allBills.length,
      },
      payments: [
        {
          status: "CREDITED",
          count: allBills.length,
          totalAmount: totalAmountInr,
        },
      ],
      centreStats,
    };
  },
};
