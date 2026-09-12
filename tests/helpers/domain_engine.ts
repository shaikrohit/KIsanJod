/**
 * tests/helpers/domain_engine.ts
 * Authoritative business logic, mathematical formulas, state machine,
 * and reference validation oracle for KisanJod.
 */

import * as crypto from 'crypto';
import {
  DigitalJForm,
  DbtPaymentRecord,
  FarmerPersona,
  MandiCenter,
  QueueTokenRecord,
  SlotBookingInput,
  TokenStatus,
  WeighmentData,
} from './types';
import {
  OFFICIAL_MSP_RATES,
  PRESEEDED_FARMERS,
  MANDI_CENTERS,
  MANDI_OPERATORS,
} from './fixtures';

export class DomainEngine {
  private static utrSequence: number = 0;
  /**
   * Validates 12-digit numeric Aadhaar string
   */
  static validateAadhaar(aadhaar: string): { valid: boolean; error?: string } {
    if (!aadhaar || typeof aadhaar !== 'string') {
      return { valid: false, error: 'Aadhaar must be a non-empty string' };
    }
    const clean = aadhaar.trim();
    if (!/^\d{12}$/.test(clean)) {
      return { valid: false, error: 'Aadhaar number must be exactly 12 numeric digits' };
    }
    return { valid: true };
  }

  /**
   * Verifies OTP against demo hint '123456'
   */
  static verifyOtp(aadhaar: string, otp: string): { success: boolean; error?: string; farmer?: FarmerPersona } {
    const aadhaarCheck = this.validateAadhaar(aadhaar);
    if (!aadhaarCheck.valid) {
      return { success: false, error: aadhaarCheck.error };
    }

    if (otp !== '123456') {
      return { success: false, error: 'Invalid OTP. For demo use hint 123456' };
    }

    const farmer = PRESEEDED_FARMERS.find(f => f.aadhaarNumber === aadhaar.trim());
    if (!farmer) {
      return { success: false, error: 'No registered farmer persona found for this Aadhaar' };
    }

    return { success: true, farmer };
  }

  /**
   * Dynamic Volume-to-Time Handling Formula:
   * Duration = 10 min base + (Quantity / 25) * 10 min
   */
  static calculateVolumeDurationMinutes(quantityQuintals: number): number {
    if (quantityQuintals <= 0) return 10;
    const processingTime = 10 + (quantityQuintals / 25) * 10;
    return Math.round(processingTime);
  }

  /**
   * Haversine distance in kilometers between two GPS coordinates
   */
  static calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }

  /**
   * Generates sequential token number e.g. TK-001, TK-002
   */
  static formatTokenNumber(sequenceIndex: number): string {
    return `TK-${String(sequenceIndex).padStart(3, '0')}`;
  }

  /**
   * Verifies booking against farmer's remaining land quota
   */
  static validateQuota(
    farmer: FarmerPersona,
    cropKey: string,
    requestedQuantity: number
  ): { allowed: boolean; remaining: number; error?: string } {
    const record = farmer.landRecords.find(r => r.verifiedSownCrop.toLowerCase() === cropKey.toLowerCase());
    if (!record) {
      return { allowed: false, remaining: 0, error: `No verified land record for crop ${cropKey}` };
    }

    if (requestedQuantity <= 0) {
      return { allowed: false, remaining: record.remainingQuotaQtl, error: 'Booking quantity must be strictly greater than 0' };
    }

    if (requestedQuantity > record.remainingQuotaQtl) {
      return {
        allowed: false,
        remaining: record.remainingQuotaQtl,
        error: `Requested quantity (${requestedQuantity} qtl) exceeds verified remaining quota (${record.remainingQuotaQtl} qtl)`,
      };
    }

    return { allowed: true, remaining: record.remainingQuotaQtl };
  }

  /**
   * Creates a sequential slot booking with locked center
   */
  static createBooking(
    input: SlotBookingInput,
    existingQueueCount: number,
    baseSlotHour: number = 9
  ): { success: boolean; token?: QueueTokenRecord; error?: string } {
    const farmer = PRESEEDED_FARMERS.find(f => f.id === input.farmerId);
    if (!farmer) return { success: false, error: 'Farmer not found' };

    const center = MANDI_CENTERS.find(c => c.id === input.centerId);
    if (!center) return { success: false, error: 'Center not found' };

    const quotaCheck = this.validateQuota(farmer, input.cropKey, input.quantityQuintals);
    if (!quotaCheck.allowed) return { success: false, error: quotaCheck.error };

    const sequenceIndex = existingQueueCount + 1;
    const tokenNumber = this.formatTokenNumber(sequenceIndex);
    const duration = this.calculateVolumeDurationMinutes(input.quantityQuintals);

    const slotMinutes = (sequenceIndex - 1) * 30;
    const totalMinutes = baseSlotHour * 60 + slotMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const scheduledTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    const token: QueueTokenRecord = {
      id: `TOKEN_${center.id}_${tokenNumber}`,
      tokenNumber,
      centerId: center.id,
      farmerId: farmer.id,
      cropKey: input.cropKey,
      quantityQuintals: input.quantityQuintals,
      scheduledTime,
      liveEta: scheduledTime,
      delayMinutes: 0,
      status: 'WAITING',
      farmersAhead: existingQueueCount,
      centerLocked: true,
      bayAssigned: (sequenceIndex % center.totalBays) + 1,
    };

    return { success: true, token };
  }

  /**
   * Dynamic Ripple ETA Recalculator:
   * When preceding token has delay/early finish of deltaMinutes, downstream tokens shift.
   * Clamped to currentTime + minTravelBuffer (15 min) for early finishes.
   */
  static recalculateRippleEta(
    downstreamToken: QueueTokenRecord,
    deltaMinutes: number,
    currentClockMinutes: number,
    minTravelBuffer: number = 15
  ): { updatedToken: QueueTokenRecord; turnNearingTriggered: boolean } {
    const [origHours, origMins] = downstreamToken.liveEta.split(':').map(Number);
    const currentEtaMinutes = origHours * 60 + origMins;

    let newEtaMinutes = currentEtaMinutes + deltaMinutes;

    // Clamping for early finish
    if (deltaMinutes < 0 && minTravelBuffer > 0) {
      const minAllowedTime = currentClockMinutes + minTravelBuffer;
      if (newEtaMinutes < minAllowedTime) {
        newEtaMinutes = minAllowedTime;
      }
    }

    const newHours = Math.floor(newEtaMinutes / 60);
    const newMinutes = newEtaMinutes % 60;
    const newEta = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;

    const newDelay = downstreamToken.delayMinutes + deltaMinutes;
    const minutesUntilEta = newEtaMinutes - currentClockMinutes;
    const turnNearingTriggered = (minutesUntilEta <= 10 && minutesUntilEta >= 0) && downstreamToken.status === 'WAITING';

    const updatedToken: QueueTokenRecord = {
      ...downstreamToken,
      liveEta: newEta,
      delayMinutes: newDelay,
      status: turnNearingTriggered ? 'NEAR_TURN' : downstreamToken.status,
    };

    return { updatedToken, turnNearingTriggered };
  }

  /**
   * Advances queue upon bill completion and fires turn-nearing event for next token
   */
  static completeTokenAndNotifyNext(
    completedToken: QueueTokenRecord,
    nextToken?: QueueTokenRecord
  ): { nextTokenUpdated?: QueueTokenRecord; eventFired: boolean } {
    completedToken.status = 'COMPLETED';
    completedToken.actualEndTime = new Date().toISOString();

    if (!nextToken || nextToken.status !== 'WAITING') {
      return { eventFired: false };
    }

    const updatedNext: QueueTokenRecord = {
      ...nextToken,
      farmersAhead: Math.max(0, nextToken.farmersAhead - 1),
      status: 'NEAR_TURN',
    };

    return { nextTokenUpdated: updatedNext, eventFired: true };
  }

  /**
   * Validates weighment values and computes Net Weight
   */
  static validateWeighment(gross: number, tare: number, moisture: number, cropKey: string): {
    valid: boolean;
    netWeight: number;
    error?: string;
  } {
    if (gross <= 0) return { valid: false, netWeight: 0, error: 'Gross weight must be greater than 0' };
    if (tare < 0) return { valid: false, netWeight: 0, error: 'Tare weight cannot be negative' };
    if (gross <= tare) return { valid: false, netWeight: 0, error: 'Gross weight must be strictly greater than Tare weight' };

    const netWeight = parseFloat((gross - tare).toFixed(2));
    if (netWeight <= 0) return { valid: false, netWeight: 0, error: 'Net weight must be positive' };

    const mspRecord = OFFICIAL_MSP_RATES.find(m => m.cropKey === cropKey.toLowerCase());
    if (mspRecord && moisture > mspRecord.maxMoistureFAQ) {
      return {
        valid: false,
        netWeight,
        error: `Moisture ${moisture}% exceeds maximum allowable FAQ limit of ${mspRecord.maxMoistureFAQ}%`,
      };
    }

    return { valid: true, netWeight };
  }

  /**
   * Calculates official MSP payout based on CACP rates and quality grade
   */
  static calculateMspPayout(cropKey: string, grade: 'Grade A' | 'FAQ', netWeightQuintals: number): {
    ratePerQuintal: number;
    totalGrossPayout: number;
    netPayable: number;
  } {
    const rateItem = OFFICIAL_MSP_RATES.find(
      r => r.cropKey.toLowerCase() === cropKey.toLowerCase() && r.grade === grade
    ) || OFFICIAL_MSP_RATES.find(
      r => r.cropKey.toLowerCase() === cropKey.toLowerCase()
    );

    const rate = rateItem ? rateItem.mspPerQuintal : 2000;
    const total = parseFloat((netWeightQuintals * rate).toFixed(2));
    return {
      ratePerQuintal: rate,
      totalGrossPayout: total,
      netPayable: total, // Zero mandi deductions for farmers
    };
  }

  /**
   * Generates statutory APMC digital J-Form with SHA-256 seal
   */
  static generateDigitalJForm(
    token: QueueTokenRecord,
    weighment: WeighmentData,
    operatorId: string
  ): DigitalJForm {
    const farmer = PRESEEDED_FARMERS.find(f => f.id === token.farmerId)!;
    const center = MANDI_CENTERS.find(c => c.id === token.centerId)!;
    const payout = this.calculateMspPayout(token.cropKey, weighment.gradeAssessed, weighment.netWeightQuintals);

    const jFormNumber = `JF-2026-${center.id.replace('MND-', '')}-${token.tokenNumber.replace('TK-', '')}`;
    const issuedAt = new Date().toISOString();

    const sealPayload = `${jFormNumber}:${token.tokenNumber}:${farmer.aadhaarNumber}:${weighment.netWeightQuintals}:${payout.netPayable}:${operatorId}:${issuedAt}`;
    const digitalSealHash = crypto.createHash('sha256').update(sealPayload).digest('hex');

    return {
      jFormSerialNumber: jFormNumber,
      tokenId: token.id,
      tokenNumber: token.tokenNumber,
      centerId: center.id,
      centerName: center.name,
      farmerId: farmer.id,
      farmerName: farmer.name,
      farmerAadhaarMasked: `XXXXXXXX${farmer.aadhaarNumber.slice(-4)}`,
      khasraNumber: farmer.landRecords[0]?.khasraNumber || 'KH-101',
      cropKey: token.cropKey,
      cropName: token.cropKey.toUpperCase(),
      qualityGrade: weighment.gradeAssessed,
      grossWeightQtl: weighment.grossWeightQuintals,
      tareWeightQtl: weighment.tareWeightQuintals,
      netWeightQtl: weighment.netWeightQuintals,
      moisturePercentage: weighment.moisturePercentage,
      mspRatePerQuintal: payout.ratePerQuintal,
      totalPayoutAmount: payout.totalGrossPayout,
      deductions: 0,
      netPayableAmount: payout.netPayable,
      operatorId,
      issuedAt,
      digitalSealHash,
      status: 'ISSUED',
    };
  }

  /**
   * Initializes PFMS treasury processing and settles DBT credit with UTR
   */
  static initializeDbtPayment(jForm: DigitalJForm): DbtPaymentRecord {
    const farmer = PRESEEDED_FARMERS.find(f => f.id === jForm.farmerId)!;
    const pfmsRef = `PFMS-2026-DOCA-${Math.floor(10000 + Math.random() * 90000)}`;

    return {
      paymentId: `PAY_${jForm.jFormSerialNumber}`,
      jFormSerialNumber: jForm.jFormSerialNumber,
      farmerId: farmer.id,
      amount: jForm.netPayableAmount,
      status: 'PROCESSING',
      pfmsBillReference: pfmsRef,
      bankName: farmer.bankAccount.bankName,
      accountNumberMasked: farmer.bankAccount.accountNumberMasked,
      ifscCode: farmer.bankAccount.ifscCode,
    };
  }

  /**
   * Settles PFMS payment to CREDITED with guaranteed collision-free Bank UTR
   * Uses monotonic sequence generator modulo 10,000,000 combined with timestamp entropy.
   * Guarantees 0 collisions across 10,000+ sequential and high-frequency iterations.
   */
  static settleDbtCredit(payment: DbtPaymentRecord): DbtPaymentRecord {
    DomainEngine.utrSequence = (DomainEngine.utrSequence + 1) % 10000000;
    const timeSlice = Date.now().toString().slice(-5);
    const counterPad = String(DomainEngine.utrSequence).padStart(7, '0');
    // Format: UTR + 5-digit timestamp + 7-digit monotonic sequence = 12 digits tail (15 chars)
    // Satisfies: length >= 12, ^UTR\d{8}\d{4}$, ^UTR\d{12}$, and zero collisions across 10,000,000 loops
    const utrNumber = `UTR${timeSlice}${counterPad}`;

    return {
      ...payment,
      status: 'CREDITED',
      bankUtrNumber: utrNumber,
      disbursementDate: new Date().toISOString(),
    };
  }
}
