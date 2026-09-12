// ============================================================================
// KisanJod - PFMS CPSMS DBT Treasury Mock Service
// Controller General of Accounts (CGA), Ministry of Finance, Govt of India
// 100% Self-Contained Local Implementation — Zero External Network Calls
// ============================================================================

export interface PfmsSanctionRequest {
  jFormSerialNumber?: string;
  billNumber?: string;
  mandiCenterCode?: string;
  totalBillAmount?: number;
  amountInr?: number;
  farmerAadhaar?: string;
  ifscCode?: string;
  maskedAccount?: string;
  beneficiary?: {
    farmerName: string;
    aadhaarNumber: string;
    bankAccountMasked: string;
    ifscCode: string;
    bankName: string;
  };
}

export interface PfmsSanctionResponse {
  status: "ACCEPTED" | "REJECTED" | "PROCESSING" | "CREDITED";
  pfmsReferenceNumber: string;
  pfmsBillReferenceNumber?: string;
  treasurySanctionOrder?: string;
  sanctionDate?: string;
  sanctionedAt?: string;
  paymentStatus?: "PROCESSING" | "CREDITED";
  statusDescription?: string;
  bankUtr?: string;
}

export interface PfmsSettlementRecord {
  pfmsBillReferenceNumber: string;
  jFormSerialNumber: string;
  paymentStatus: "PROCESSING" | "CREDITED" | "FAILED";
  bankUtrNumber: string | null;
  clearedAmount: number;
  disbursementDate: string | null;
  settlementChannel: string;
  statusCode: string;
  failureReason?: string | null;
}

// ----------------------------------------------------------------------------
// In-Memory PFMS Bill State Registry
// ----------------------------------------------------------------------------

const PFMS_REGISTRY = new Map<string, PfmsSettlementRecord>();

// Bank IFSC 4-letter prefixes to standard 4-char routing codes
const BANK_PREFIX_MAP: Record<string, string> = {
  PUNB: "PUNB",
  SBIN: "SBIN",
  BARB: "BARB",
  MAHB: "MAHB",
  CNRB: "CNRB",
  UBIN: "UBIN",
  CBIN: "CBIN",
  BKID: "BKID",
  MPGB: "MPGB",
};

let pfmsUtrCounter = 0;

/**
 * Generate standard 16-character Indian Banking UTR
 * Format: 4-letter bank prefix + 2-digit year + 3-digit Julian day of year + 7-digit monotonic sequence counter
 * Total: exactly 16 characters (e.g. PUNB262510000001)
 */
export function generateBankUtr(bankPrefixOrIfsc: string = "PUNBH"): string {
  const cleanPrefix = (bankPrefixOrIfsc.substring(0, 4) || "SBIN").toUpperCase();
  const bankCode = BANK_PREFIX_MAP[cleanPrefix] || cleanPrefix.padEnd(4, "X").slice(0, 4);

  const date = new Date();
  const year2Digits = date.getFullYear().toString().slice(-2); // e.g. "26"

  // Day of year (Julian day: 001 - 366)
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay).toString().padStart(3, "0");

  // Monotonic 7-digit sequential counter modulo 10,000,000
  // Guarantees zero collisions across 10,000,000 transactions per day
  pfmsUtrCounter = (pfmsUtrCounter + 1) % 10000000;
  const sequenceStr = String(pfmsUtrCounter).padStart(7, "0");

  // Exactly 16 alphanumeric characters: 4 Bank + 2 Year + 3 Julian + 7 Sequence
  return `${bankCode}${year2Digits}${dayOfYear}${sequenceStr}`;
}

/**
 * Generate statutory PFMS Bill Reference Number
 * Format: PFMS-2026-DOCA-<CENTER>-<RANDOM_SERIAL>
 */
export function generateBillReference(centerCode: string = "DOCA"): string {
  const cleanCenter = centerCode.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const serial = Math.floor(10000 + Math.random() * 90000);
  return `PFMS-2026-DOCA-${cleanCenter}-${serial}`;
}

export function generatePfmsSanction(req: PfmsSanctionRequest): PfmsSanctionResponse {
  const center = req.mandiCenterCode || "DOCA";
  const billRef = generateBillReference(center);
  const now = new Date().toISOString();
  const amount = req.totalBillAmount ?? req.amountInr ?? 0;
  const jForm = req.jFormSerialNumber || req.billNumber || "JF-DEMO";

  const record: PfmsSettlementRecord = {
    pfmsBillReferenceNumber: billRef,
    jFormSerialNumber: jForm,
    paymentStatus: "PROCESSING",
    bankUtrNumber: null,
    clearedAmount: amount,
    disbursementDate: null,
    settlementChannel: "NPCI-APBS",
    statusCode: "01",
  };
  PFMS_REGISTRY.set(billRef, record);

  return {
    status: "ACCEPTED",
    pfmsReferenceNumber: billRef,
    pfmsBillReferenceNumber: billRef,
    treasurySanctionOrder: `SANCT-${new Date().getFullYear()}-09-${Math.floor(10000 + Math.random() * 90000)}`,
    sanctionDate: now,
    sanctionedAt: now,
    paymentStatus: "PROCESSING",
    statusDescription: "Bill sanctioned by PAO; queued for RBI-NEFT/APBS clearing batch.",
  };
}

export const pfmsMock = {
  generateBankUtr,
  generateBillReference,
  generateTreasuryBill(request: PfmsSanctionRequest): PfmsSanctionResponse {
    return generatePfmsSanction(request);
  },
  generatePfmsSanction,

  /**
   * Transition bill status from PROCESSING to CREDITED with 16-character Bank UTR
   */
  transitionToCredited(pfmsBillReferenceNumber: string, ifscCode: string = "SBIN0001144"): PfmsSettlementRecord {
    const record = PFMS_REGISTRY.get(pfmsBillReferenceNumber) || {
      pfmsBillReferenceNumber,
      jFormSerialNumber: `JF-MANUAL-${Date.now()}`,
      paymentStatus: "PROCESSING" as const,
      bankUtrNumber: null,
      clearedAmount: 0.0,
      disbursementDate: null,
      settlementChannel: "NPCI-APBS",
      statusCode: "01",
    };

    const utr = generateBankUtr(ifscCode);
    const nowIso = new Date().toISOString();

    record.paymentStatus = "CREDITED";
    record.bankUtrNumber = utr;
    record.disbursementDate = nowIso;
    record.statusCode = "00";

    PFMS_REGISTRY.set(pfmsBillReferenceNumber, record);
    return record;
  },

  /**
   * Transition bill status to FAILED
   */
  transitionToFailed(pfmsBillReferenceNumber: string, failureReason: string = "Account Dormant or Invalid IFSC"): PfmsSettlementRecord {
    const record = PFMS_REGISTRY.get(pfmsBillReferenceNumber) || {
      pfmsBillReferenceNumber,
      jFormSerialNumber: `JF-MANUAL-${Date.now()}`,
      paymentStatus: "PROCESSING" as const,
      bankUtrNumber: null,
      clearedAmount: 0.0,
      disbursementDate: null,
      settlementChannel: "NPCI-APBS",
      statusCode: "01",
    };

    record.paymentStatus = "FAILED";
    record.failureReason = failureReason;
    record.statusCode = "99";

    PFMS_REGISTRY.set(pfmsBillReferenceNumber, record);
    return record;
  },

  /**
   * Query current settlement status of a PFMS bill reference
   */
  getBillStatus(pfmsBillReferenceNumber: string): PfmsSettlementRecord | null {
    return PFMS_REGISTRY.get(pfmsBillReferenceNumber) || null;
  },
};

export default pfmsMock;

