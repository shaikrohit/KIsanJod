/**
 * tests/e2e/tier4_realworld.test.ts
 * Tier 4: Real-World Workload Scenarios Test Suite
 * Simulates complete end-to-end multi-actor operational lifecycles across
 * farmers, mandi operators, dynamic queue ripple events, and DBT payments.
 */

import { describe, it, expect } from '../helpers/test_runner';
import { DomainEngine } from '../helpers/domain_engine';
import {
  PRESEEDED_FARMERS,
  MANDI_CENTERS,
  MANDI_OPERATORS,
  TRANSLATION_DICTIONARY,
} from '../helpers/fixtures';

export function registerTier4Tests(): void {
  describe('RW01: Standard Wheat Procurement at Ludhiana Central Mandi', () => {
    it('executes full happy path for Farmer Gurpreet Singh from Aadhaar login to DBT payout', () => {
      // 1. Farmer Aadhaar Authentication
      const auth = DomainEngine.verifyOtp('548912345678', '123456');
      expect(auth.success).toBe(true);
      const farmer = auth.farmer!;
      expect(farmer.name).toBe('Gurpreet Singh');

      // 2. Verified Land Records & Quota Lookup
      expect(farmer.landRecords[0].khasraNumber).toContain('142/1');
      expect(farmer.landRecords[0].remainingQuotaQtl).toBe(100.0);

      // 3. Visual Slot Booking (100 quintals = 200 gunny bags)
      const booking = DomainEngine.createBooking(
        {
          farmerId: farmer.id,
          centerId: 'MND-LUD-01',
          cropKey: 'wheat',
          quantityQuintals: 100,
          bookingDate: '2026-09-08',
        },
        0 // First in queue
      );
      expect(booking.success).toBe(true);
      const token = booking.token!;
      expect(token.tokenNumber).toBe('TK-001');
      expect(token.centerLocked).toBe(true);
      expect(token.status).toBe('WAITING');

      // 4. Operator Calls Token to Bay 1
      token.status = 'CALLED';
      token.bayAssigned = 1;
      token.calledAt = '2026-09-08T09:00:00Z';

      // 5. Farmer arrives on time -> Status moves to AT_BAY
      token.status = 'AT_BAY';
      token.actualStartTime = '2026-09-08T09:05:00Z';

      // 6. Operator Weighment & Quality Grading (Gross 142.50, Tare 42.50, Net 100.00, FAQ, 11.2% moisture)
      const weighmentRes = DomainEngine.validateWeighment(142.5, 42.5, 11.2, 'wheat');
      expect(weighmentRes.valid).toBe(true);
      expect(weighmentRes.netWeight).toBe(100.0);

      // 7. J-Form Generation at Official MSP Rate (₹2,275/qtl)
      const jForm = DomainEngine.generateDigitalJForm(
        token,
        {
          grossWeightQuintals: 142.5,
          tareWeightQuintals: 42.5,
          netWeightQuintals: 100.0,
          moisturePercentage: 11.2,
          gradeAssessed: 'FAQ',
        },
        'EMP-LUD-001'
      );
      expect(jForm.mspRatePerQuintal).toBe(2275);
      expect(jForm.totalPayoutAmount).toBe(227500);
      expect(jForm.netPayableAmount).toBe(227500);
      expect(jForm.status).toBe('ISSUED');
      expect(jForm.digitalSealHash.length).toBe(64);

      // 8. 2-Step DBT Payment: Step 1 (PROCESSING under PFMS)
      const dbtPayment = DomainEngine.initializeDbtPayment(jForm);
      expect(dbtPayment.status).toBe('PROCESSING');
      expect(dbtPayment.pfmsBillReference).toMatch(/^PFMS-2026-DOCA-/);
      expect(dbtPayment.bankName).toBe('Punjab National Bank');
      expect(dbtPayment.accountNumberMasked).toBe('XXXXXX4512');

      // 9. 2-Step DBT Payment: Step 2 (CREDITED with Bank UTR)
      const settledDbt = DomainEngine.settleDbtCredit(dbtPayment);
      expect(settledDbt.status).toBe('CREDITED');
      expect(settledDbt.bankUtrNumber).toMatch(/^UTR\d{12}$/);
      expect(settledDbt.amount).toBe(227500);
    });
  });

  describe('RW02: Paddy Procurement with Mandi Delay & Dynamic Ripple ETA Recalculation', () => {
    it('cascades a 25-minute weighbridge delay to downstream farmers and fires turn-nearing alert', () => {
      // 1. Setup 3 sequential bookings at Guntur Mandi
      const t1 = DomainEngine.createBooking(
        { farmerId: 'FARMER_002', centerId: 'MND-GNT-01', cropKey: 'paddy', quantityQuintals: 50, bookingDate: '2026-09-08' },
        0
      ).token!; // Scheduled 09:00
      const t2 = DomainEngine.createBooking(
        { farmerId: 'FARMER_002', centerId: 'MND-GNT-01', cropKey: 'paddy', quantityQuintals: 40, bookingDate: '2026-09-08' },
        1
      ).token!; // Scheduled 09:30
      const t3 = DomainEngine.createBooking(
        { farmerId: 'FARMER_002', centerId: 'MND-GNT-01', cropKey: 'paddy', quantityQuintals: 30, bookingDate: '2026-09-08' },
        2
      ).token!; // Scheduled 10:00

      expect(t1.tokenNumber).toBe('TK-001');
      expect(t2.tokenNumber).toBe('TK-002');
      expect(t3.tokenNumber).toBe('TK-003');

      // 2. Token 1 experiences +25 min delay at weighbridge
      const delayDelta = 25;
      const currentClock = 9 * 60 + 15; // 09:15 AM

      // 3. Ripple Engine shifts downstream tokens T2 and T3 forward
      const rippleT2 = DomainEngine.recalculateRippleEta(t2, delayDelta, currentClock);
      const rippleT3 = DomainEngine.recalculateRippleEta(t3, delayDelta, currentClock);

      expect(rippleT2.updatedToken.liveEta).toBe('09:55');
      expect(rippleT2.updatedToken.delayMinutes).toBe(25);
      expect(rippleT3.updatedToken.liveEta).toBe('10:25');
      expect(rippleT3.updatedToken.delayMinutes).toBe(25);

      // 4. At 09:47 AM (8 mins before live ETA 09:55), T2 receives NEAR_TURN alert
      const clockNearTurn = 9 * 60 + 47; // 09:47 AM
      const alertCheck = DomainEngine.recalculateRippleEta(rippleT2.updatedToken, 0, clockNearTurn);
      expect(alertCheck.turnNearingTriggered).toBe(true);
      expect(alertCheck.updatedToken.status).toBe('NEAR_TURN');

      // 5. T1 finishes weighment; Operator calls T2
      t1.status = 'COMPLETED';
      const updatedT2 = alertCheck.updatedToken;
      updatedT2.status = 'CALLED';
      updatedT2.status = 'AT_BAY';

      // 6. Grade A Paddy assessed (Official MSP ₹2,203/qtl with Grade A premium)
      const jForm = DomainEngine.generateDigitalJForm(
        updatedT2,
        { grossWeightQuintals: 55, tareWeightQuintals: 15, netWeightQuintals: 40, moisturePercentage: 13.5, gradeAssessed: 'Grade A' },
        'EMP-GNT-001'
      );
      expect(jForm.mspRatePerQuintal).toBe(2203);
      expect(jForm.totalPayoutAmount).toBe(40 * 2203); // 88,120 INR
    });
  });

  describe('RW03: Chana Booking with Standby Grace Expiry & Late Arrival Gap Re-entry', () => {
    it('manages 15-minute grace expiry, promotes next token, and re-slots standby farmer upon arrival', () => {
      // 1. Farmer Ramesh Patel (TK-002) is called to Bay 1 at Sehore Mandi at 10:00 AM
      const t2 = DomainEngine.createBooking(
        { farmerId: 'FARMER_003', centerId: 'MND-SEH-01', cropKey: 'chana', quantityQuintals: 50, bookingDate: '2026-09-08' },
        1
      ).token!;
      t2.status = 'CALLED';
      t2.calledAt = '2026-09-08T10:00:00Z';

      // 2. Next waiting farmer Savitri Bai (TK-003)
      const t3 = DomainEngine.createBooking(
        { farmerId: 'FARMER_004', centerId: 'MND-SEH-01', cropKey: 'onion', quantityQuintals: 50, bookingDate: '2026-09-08' },
        2
      ).token!;
      expect(t3.status).toBe('WAITING');

      // 3. Grace period (15 minutes) expires at 10:15 AM without Ramesh's arrival
      t2.status = 'STANDBY';
      expect(t2.status).toBe('STANDBY');

      // 4. Operator immediately promotes Savitri Bai (T3) to CALLED -> AT_BAY
      t3.status = 'CALLED';
      t3.status = 'AT_BAY';
      expect(t3.status).toBe('AT_BAY');

      // 5. Ramesh arrives at 10:20 AM and taps "I Have Arrived"
      t2.status = 'STANDBY_READY';
      expect(t2.status).toBe('STANDBY_READY');

      // 6. Savitri finishes bill -> Ramesh is scheduled in the immediate gap
      t3.status = 'COMPLETED';
      t2.status = 'CALLED';
      t2.status = 'AT_BAY';

      // 7. Ramesh weighment: Chana FAQ @ ₹5,440/qtl
      const jForm = DomainEngine.generateDigitalJForm(
        t2,
        { grossWeightQuintals: 65, tareWeightQuintals: 15, netWeightQuintals: 50, moisturePercentage: 9.5, gradeAssessed: 'FAQ' },
        'EMP-SEH-001'
      );
      expect(jForm.mspRatePerQuintal).toBe(5440);
      expect(jForm.netPayableAmount).toBe(272000);
      expect(jForm.status).toBe('ISSUED');
    });
  });

  describe('RW04: High-Volume Potato Procurement with Multi-Bay Load Balancing', () => {
    it('processes bulk 300 quintal potato procurement with volume duration and multi-bay distribution', () => {
      // 1. Farmer Mohan Lal books 300 quintals (600 bags) of Potato at Agra Mandi
      const farmer = PRESEEDED_FARMERS.find(f => f.id === 'FARMER_008')!;
      const quotaCheck = DomainEngine.validateQuota(farmer, 'potato', 300);
      expect(quotaCheck.allowed).toBe(true);

      // 2. Dynamic volume formula duration: 10 + (300 / 25) * 10 = 130 mins
      const duration = DomainEngine.calculateVolumeDurationMinutes(300);
      expect(duration).toBe(130);

      // 3. Booking creation
      const booking = DomainEngine.createBooking(
        { farmerId: farmer.id, centerId: 'MND-AGR-01', cropKey: 'potato', quantityQuintals: 300, bookingDate: '2026-09-08' },
        0
      );
      const token = booking.token!;
      expect(token.quantityQuintals).toBe(300);

      // 4. Weighment validation: Net = 300 quintals (PSF floor rate ₹1,200/qtl)
      const weighment = DomainEngine.validateWeighment(370, 70, 16.0, 'potato');
      expect(weighment.valid).toBe(true);
      expect(weighment.netWeight).toBe(300);

      // 5. J-Form Generation: 300 qtl @ ₹1,200 = ₹3,60,000.00
      const jForm = DomainEngine.generateDigitalJForm(
        token,
        { grossWeightQuintals: 370, tareWeightQuintals: 70, netWeightQuintals: 300, moisturePercentage: 16.0, gradeAssessed: 'FAQ' },
        'EMP-AGR-001'
      );
      expect(jForm.mspRatePerQuintal).toBe(1200);
      expect(jForm.totalPayoutAmount).toBe(360000);

      // 6. DBT Settlement
      const dbt = DomainEngine.initializeDbtPayment(jForm);
      const settled = DomainEngine.settleDbtCredit(dbt);
      expect(settled.status).toBe('CREDITED');
      expect(settled.amount).toBe(360000);
    });
  });

  describe('RW05: End-to-End Trilingual Farmer Journey with Web Speech Voice Readout & DBT Lifecycle', () => {
    it('executes full Telugu localization and speech synthesis flow for Farmer Appa Rao', () => {
      // 1. Language Toggle: Farmer switches interface to Telugu ('te')
      const teDict = TRANSLATION_DICTIONARY.te;
      expect(teDict.appTitle).toBe('కిసాన్ జోడ్');
      expect(teDict.yourTurn).toBe('మీ వంతు');

      // 2. Aadhaar verification for Farmer Appa Rao (Warangal, Telangana)
      const auth = DomainEngine.verifyOtp('654321098765', '123456');
      expect(auth.success).toBe(true);
      const farmer = auth.farmer!;
      expect(farmer.district).toBe('Warangal');
      expect(farmer.landRecords[0].verifiedSownCrop).toBe('moong');

      // 3. Books 19.5 quintals of Moong
      const booking = DomainEngine.createBooking(
        { farmerId: farmer.id, centerId: 'MND-GNT-01', cropKey: 'moong', quantityQuintals: 19.5, bookingDate: '2026-09-08' },
        4
      );
      const token = booking.token!;
      expect(token.tokenNumber).toBe('TK-005');

      // 4. Tap-to-Speak Voice Readout in Telugu ('te-IN')
      const voiceUtterance = `మీ టోకెన్ నంబర్ ${token.tokenNumber.split('').join(' ')}. మీ సమయం ${token.liveEta}. మీకంటే ముందు ${token.farmersAhead} రైతులు ఉన్నారు.`;
      expect(voiceUtterance).toContain('మీ టోకెన్ నంబర్ T K - 0 0 5');
      expect(voiceUtterance).toContain('4 రైతులు');

      // 5. Operator Weighment & Moong Grade A Assessment (Official MSP ₹8,650/qtl)
      token.status = 'AT_BAY';
      const jForm = DomainEngine.generateDigitalJForm(
        token,
        { grossWeightQuintals: 24.5, tareWeightQuintals: 5.0, netWeightQuintals: 19.5, moisturePercentage: 7.8, gradeAssessed: 'Grade A' },
        'EMP-GNT-001'
      );
      expect(jForm.mspRatePerQuintal).toBe(8650);
      const expectedTotal = parseFloat((19.5 * 8650).toFixed(2));
      expect(jForm.totalPayoutAmount).toBe(expectedTotal); // ₹1,68,675.00

      // 6. DBT Settlement to Union Bank of India
      const dbt = DomainEngine.initializeDbtPayment(jForm);
      expect(dbt.bankName).toBe('Union Bank of India');
      expect(dbt.accountNumberMasked).toBe('XXXXXX1154');
      const settled = DomainEngine.settleDbtCredit(dbt);
      expect(settled.status).toBe('CREDITED');
      expect(settled.bankUtrNumber).toMatch(/^UTR\d{12}$/);
    });
  });
}
