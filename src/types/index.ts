// ============================================================================
// KisanJod Platform - Unified TypeScript Domain Types & Interface Contracts
// Department of Consumer Affairs (DoCA), Government of India
// ============================================================================

// ----------------------------------------------------------------------------
// Core Domain Enums & Union Types (SQLite Compliant)
// ----------------------------------------------------------------------------

export type LanguageCode = "en" | "hi" | "te";

export type CommodityCategory =
  | "GRAINS"
  | "PULSES"
  | "VEGETABLES_FRUITS";

export type PackagingUnit =
  | "GUNNY_BAG_50KG"
  | "CRATE_25KG"
  | "QUINTALS";

export type CropSeason =
  | "RABI_2024_25"
  | "KHARIF_2024_25"
  | "ALL_SEASON";

export type QualityGrade = "GRADE_A" | "FAQ" | "REJECTED";

export type BookingStatus =
  | "WAITING"
  | "CALLED"
  | "AT_BAY"
  | "STANDBY"
  | "COMPLETED"
  | "CANCELLED";

export type QueueEventType =
  | "SLOT_CONFIRMED"
  | "CALLED_TO_BAY"
  | "TURN_NEARING_10MIN"
  | "STANDBY_MARKED"
  | "STANDBY_RESUMED"
  | "COMPLETED";

export type QueueEventTrigger = "SYSTEM" | "OPERATOR";

export type PaymentStatus = "PROCESSING" | "CREDITED" | "FAILED";

export type OperatorRole = "OPERATOR" | "SUPERVISOR";

// ----------------------------------------------------------------------------
// Entity Models (Mirroring Prisma Data Types)
// ----------------------------------------------------------------------------

export interface FarmerEntity {
  id: string;
  aadhaarNumber: string;
  maskedAadhaar: string;
  fullName: string;
  phoneNumber: string;
  state: string;
  district: string;
  village: string;
  languagePreference: LanguageCode;
  createdAt: Date;
  updatedAt: Date;
}

export interface LandRecordEntity {
  id: string;
  farmerId: string;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface BankAccountEntity {
  id: string;
  farmerId: string;
  bankName: string;
  accountNumberMasked: string;
  ifscCode: string;
  pfmsBeneficiaryCode: string;
  isAadhaarLinked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcurementCenterEntity {
  id: string;
  centerCode: string;
  name: string;
  state: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  baysCount: number;
  activeWorkers?: number;
  maxDailySlots: number;
  dailyCapacityQtl: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OperatorEntity {
  id: string;
  centerId: string;
  employeeId: string;
  fullName: string;
  pinCode: string;
  phoneNumber?: string | null;
  role: OperatorRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingEntity {
  id: string;
  bookingNumber: string;
  tokenNumber: string;
  farmerId: string;
  centerId: string;
  cropName: string;
  commodityCategory: CommodityCategory;
  unitType: PackagingUnit;
  packageCount: number;
  estimatedQuantityQtl: number;
  bookedDate: string;
  scheduledSlotStart: string;
  scheduledSlotEnd: string;
  dynamicEta: string;
  delayMinutes: number;
  status: BookingStatus;
  bayAssigned?: number | null;
  sessionName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueueEventEntity {
  id: string;
  bookingId: string;
  eventType: QueueEventType;
  description: string;
  triggeredBy: QueueEventTrigger;
  metadataJson?: string | null;
  timestamp: Date;
}

export interface ProcurementBillEntity {
  id: string;
  billNumber: string;
  bookingId: string;
  centerId: string;
  operatorId: string;
  farmerId: string;
  cropName: string;
  qualityGrade: QualityGrade;
  measuredMoisturePct: number;
  grossWeightQtl: number;
  tareWeightQtl: number;
  netWeightQtl: number;
  notifiedMspRate: number;
  grossAmountPayable: number;
  deductionsAmount: number;
  netAmountPayable: number;
  digitalSealHash: string;
  qrPayload: string;
  issuedAt: Date;
}

export interface DbtPaymentEntity {
  id: string;
  billId: string;
  pfmsReferenceNumber: string;
  status: PaymentStatus;
  beneficiaryMaskedAc: string;
  bankIfsc: string;
  bankName: string;
  bankUtr?: string | null;
  amountInr: number;
  disbursementDate?: Date | null;
  failureReason?: string | null;
  createdAt: Date;
  creditedAt?: Date | null;
}

export interface HourlySlotCapacityEntity {
  id: string;
  centerId: string;
  date: string;
  hourOfDay: number;
  bookedCount: number;
  maxCapacity: number;
}

// ----------------------------------------------------------------------------
// Farmer Authentication & Profile Contracts
// ----------------------------------------------------------------------------

export interface AadhaarAuthRequest {
  aadhaarNumber: string; // 12 digits
  otp?: string;
}

export interface OtpVerifyRequest {
  aadhaarNumber: string;
  otp: string; // 6 digits, demo hint: "123456"
}

export interface FarmerProfile {
  id: string;
  aadhaarNumber: string;
  maskedAadhaar: string;
  fullName: string;
  name?: string; // Compatibility alias
  phoneNumber: string;
  mobileNumber?: string; // Compatibility alias
  district: string;
  state: string;
  village: string;
  languagePreference: LanguageCode;
  landRecords: {
    id?: string;
    khasraNumber: string;
    khatauniNumber?: string;
    subDivision?: string;
    cropSeason?: string;
    cropSown?: string;
    verifiedSownCrop: string;
    sownAreaAcres: number;
    verifiedAcreage?: number;
    mspProductivityNormQtlPerAcre?: number;
    maxProcurementQuotaQtl: number;
    maxProcurementQuotaQuintals?: number;
    utilizedQuotaQtl: number;
    remainingQuotaQtl?: number;
  }[];
  bankAccount: {
    bankName: string;
    accountNumberMasked: string;
    ifscCode: string;
    pfmsBeneficiaryCode?: string;
  };
}

// ----------------------------------------------------------------------------
// Mandi Centers & Catalog Contracts
// ----------------------------------------------------------------------------

export interface CenterSummary {
  id: string;
  centerCode: string;
  name: string;
  state: string;
  district: string;
  address: string;
  distanceKm?: number;
  baysCount: number;
  activeWorkers?: number;
  availableSlotsToday: number;
  isActive: boolean;
}

export interface CropCommodity {
  id: string;
  nameEn: string;
  nameHi: string;
  nameTe: string;
  category: CommodityCategory;
  variety: string;
  notifiedMspPerQtl: number;
  standardPackaging: PackagingUnit;
  kgPerPackage: number;
  maxMoisturePctFAQ: number;
  maxMoisturePctGradeA: number;
  iconName: string;
  imageUrl?: string;
}

// ----------------------------------------------------------------------------
// Slot Booking & Queue Tracking Contracts
// ----------------------------------------------------------------------------

export interface SlotBookingRequest {
  farmerId: string;
  centerId: string;
  cropName: string;
  cropCommodity?: string;
  commodityCategory?: CommodityCategory;
  unitType?: PackagingUnit;
  packageCount?: number;
  quantityQuintals: number;
  bookingDate: string; // YYYY-MM-DD
  slotTime?: string; // HH:mm
}

export interface SlotBookingResult {
  bookingId: string;
  bookingNumber?: string;
  tokenNumber: string; // "TK-001"
  centerId?: string;
  centerName: string;
  centerCode?: string;
  bookedDate?: string;
  scheduledSlotStart: string;
  scheduledSlotEnd: string;
  dynamicEta?: string;
  bayAssigned: number;
  sessionName?: string;
  status: BookingStatus;
}

export interface QueueStatusResponse {
  bookingId?: string;
  tokenNumber: string;
  centerId?: string;
  centerName?: string;
  scheduledSlotStart: string;
  dynamicEta: string;
  delayMinutes: number;
  status: BookingStatus;
  bayNumber?: number;
  bayAssigned?: number | null;
  sessionName?: string;
  servingTokenNumber: string | null;
  farmersAheadCount: number;
  turnAlertActive: boolean; // True if <= 10 min
  immediateCallActive: boolean; // True if status is CALLED
  isStandby: boolean;
}

// ----------------------------------------------------------------------------
// Operator & J-Form Receipt Contracts
// ----------------------------------------------------------------------------

export interface OperatorAuthRequest {
  employeeId: string;
  pin: string;
}

export interface OperatorProfile {
  id: string;
  employeeId: string;
  fullName: string;
  centerId: string;
  centerCode: string;
  centerName: string;
  role: OperatorRole;
}

export interface OperatorWeighmentSubmission {
  operatorId: string;
  bookingId: string;
  tokenNumber?: string;
  grossWeightQuintals: number;
  tareWeightQuintals: number;
  netWeightQuintals?: number;
  cropGrade: "GRADE_A" | "FAQ";
  moisturePercentage: number;
}

export interface JFormReceipt {
  receiptId: string;
  billNumber: string; // e.g. "JF-2026-LUD01-00104"
  bookingId: string;
  tokenNumber: string;
  farmerName: string;
  cropCommodity?: string;
  maskedAadhaar?: string;
  village?: string;
  district?: string;
  state?: string;
  centerName?: string;
  centerCode?: string;
  cropName: string;
  cropGrade: string;
  measuredMoisturePct?: number;
  grossWeightQtl?: number;
  tareWeightQtl?: number;
  netWeightQuintals: number;
  mspRatePerQuintal: number;
  totalGrossPayout: number;
  deductionsAmount?: number;
  netFarmerPayout: number;
  operatorName?: string;
  operatorEmployeeId?: string;
  digitalSealHash?: string;
  sealHash?: string; // Compatibility alias
  qrPayload?: string;
  issuedAt: string;
}

// ----------------------------------------------------------------------------
// DBT Payment Tracking Contracts
// ----------------------------------------------------------------------------

export interface DbtRecord {
  paymentId: string;
  receiptId?: string;
  billId?: string;
  billNumber?: string;
  farmerId: string;
  farmerName?: string;
  amount: number;
  status: "PROCESSING" | "CREDITED" | "FAILED";
  pfmsBillReference: string;
  bankUtrNumber?: string | null;
  disbursementDate?: string | null;
  bankName: string;
  accountNumberMasked: string;
  ifscCode: string;
}

export interface DbtTransitionRequest {
  billId: string;
  action: "CREDIT_DBT" | "FAIL_DBT";
  bankUtr?: string;
  failureReason?: string;
}

// ----------------------------------------------------------------------------
// DoCA Executive Analytics Contracts
// ----------------------------------------------------------------------------

export interface AnalyticsOverview {
  totalProcurementVolumeQtl: number;
  totalDisbursementAmountInr: number;
  totalFarmersServed: number;
  averageWaitTimeMinutes: number;
  baselineWaitTimeMinutes: number; // 270 mins
  waitTimeSavedMinutes: number; // 270 - actual
  activeCentersCount: number;
  totalBookingsCount: number;
  dbtClearanceRatePercentage: number;
}

export interface HourlyUtilizationRecord {
  hourSlot: string; // e.g. "09:00 - 10:00"
  totalCapacity: number;
  bookedSlots: number;
  completedSlots: number;
  utilizationPercentage: number;
}

// ----------------------------------------------------------------------------
// Universal API Response Envelope
// ----------------------------------------------------------------------------

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

