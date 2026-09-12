/**
 * tests/helpers/types.ts
 * Domain contracts and type definitions for KisanJod E2E Test Suite.
 */

export type Locale = 'en' | 'hi' | 'te';

export type TokenStatus = 
  | 'WAITING'
  | 'NEAR_TURN'
  | 'CALLED'
  | 'AT_BAY'
  | 'STANDBY'
  | 'STANDBY_READY'
  | 'COMPLETED'
  | 'CANCELLED';

export type CropCategory = 'GRAINS' | 'PULSES' | 'VEGETABLES_FRUITS';

export type CropQualityGrade = 'Grade A' | 'FAQ';

export type PaymentStatus = 'PROCESSING' | 'CREDITED' | 'FAILED';

export interface FarmerLandRecord {
  id: string;
  khasraNumber: string;
  khatauniNumber: string;
  village: string;
  tehsilSubDistrict: string;
  district: string;
  state: string;
  totalLandAreaAcres: number;
  cropSeason: string;
  verifiedSownCrop: string;
  sownAreaAcres: number;
  verifiedAcreage?: number;
  mspProductivityNormQtlPerAcre: number;
  maxProcurementQuotaQtl: number;
  maxProcurementQuotaQuintals?: number;
  utilizedQuotaQtl: number;
  remainingQuotaQtl: number;
}

export interface FarmerBankAccount {
  bankName: string;
  accountNumberMasked: string;
  ifscCode: string;
}

export interface FarmerPersona {
  id: string;
  name: string;
  district: string;
  state: string;
  aadhaarNumber: string;
  phone: string;
  landRecords: FarmerLandRecord[];
  bankAccount: FarmerBankAccount;
}

export interface MandiBay {
  id: string;
  bayNumber: number;
  name: string;
  status: 'IDLE' | 'BUSY' | 'MAINTENANCE';
}

export interface MandiCenter {
  id: string;
  name: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  totalBays: number;
  bays: MandiBay[];
  activeStatus: boolean;
}

export interface MandiOperator {
  id: string;
  employeeId: string;
  pin: string;
  name: string;
  assignedCenterId: string;
}

export interface OfficialMspRate {
  cropKey: string;
  cropName: string;
  category: CropCategory;
  grade: CropQualityGrade;
  mspPerQuintal: number;
  maxMoistureFAQ: number;
  maxMoistureGradeA: number;
}

export interface SlotBookingInput {
  farmerId: string;
  centerId: string;
  cropKey: string;
  quantityQuintals: number;
  bookingDate: string;
  slotTimeWindow?: string;
}

export interface QueueTokenRecord {
  id: string;
  tokenNumber: string;
  centerId: string;
  farmerId: string;
  cropKey: string;
  quantityQuintals: number;
  scheduledTime: string;
  liveEta: string;
  delayMinutes: number;
  status: TokenStatus;
  bayAssigned?: number;
  calledAt?: string;
  graceExpiresAt?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  farmersAhead: number;
  centerLocked: boolean;
}

export interface WeighmentData {
  grossWeightQuintals: number;
  tareWeightQuintals: number;
  netWeightQuintals: number;
  moisturePercentage: number;
  gradeAssessed: CropQualityGrade;
}

export interface DigitalJForm {
  jFormSerialNumber: string;
  tokenId: string;
  tokenNumber: string;
  centerId: string;
  centerName: string;
  farmerId: string;
  farmerName: string;
  farmerAadhaarMasked: string;
  khasraNumber: string;
  cropKey: string;
  cropName: string;
  qualityGrade: CropQualityGrade;
  grossWeightQtl: number;
  tareWeightQtl: number;
  netWeightQtl: number;
  moisturePercentage: number;
  mspRatePerQuintal: number;
  totalPayoutAmount: number;
  deductions: number;
  netPayableAmount: number;
  operatorId: string;
  issuedAt: string;
  digitalSealHash: string;
  status: 'ISSUED' | 'DISBURSED';
}

export interface DbtPaymentRecord {
  paymentId: string;
  jFormSerialNumber: string;
  farmerId: string;
  amount: number;
  status: PaymentStatus;
  pfmsBillReference: string;
  bankUtrNumber?: string;
  disbursementDate?: string;
  bankName: string;
  accountNumberMasked: string;
  ifscCode: string;
}
