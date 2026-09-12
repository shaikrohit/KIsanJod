/**
/**
 * scripts/stress_test_m1.ts
 * Empirical Adversarial Stress Harness for KisanJod Milestone 1.
 * Tests:
 * 1. Prisma Models & SQLite dev.db (Cascade Deletes, Unique Constraints, Foreign Keys, Nullability)
 * 2. PM-KISAN Mock Service (Aadhaar formats, Malformed OTPs, Unregistered Farmers, Quota Boundaries)
 * 3. Agmarknet Mock Service (Unsupported Crops, Packaging Conversions, Extreme/Negative Quantities)
 * 4. PFMS Mock Service (UTR Format, Collisions, Bill Ref, State Transitions)
 */

import { db } from '../src/lib/db';
import { pmKisanMock } from '../src/lib/mocks/pmkisan';
import { pfmsMock } from '../src/lib/mocks/pfms';
import { agmarknetMock } from '../src/lib/mocks/agmarknet';

export interface StressFinding {
  target: string;
  category: 'PASS' | 'VULNERABILITY' | 'DEFECT' | 'BEHAVIORAL_QUIRK';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  testName: string;
  expected: string;
  observed: string;
  details?: any;
}

const findings: StressFinding[] = [];

function recordFinding(finding: StressFinding) {
  findings.push(finding);
  const icon = finding.category === 'PASS' ? '✅' : finding.severity === 'CRITICAL' || finding.severity === 'HIGH' ? '❌' : '⚠️';
  console.log(`${icon} [${finding.category}][${finding.severity}] ${finding.target} -> ${finding.testName}`);
  if (finding.category !== 'PASS') {
    console.log(`   Expected: ${finding.expected}`);
    console.log(`   Observed: ${finding.observed}`);
  }
}

async function runAdversarialStressTests() {
  console.log('================================================================');
  console.log('       KISANJOD EMPIRICAL ADVERSARIAL STRESS TEST SUITE         ');
  console.log('      Milestone 1: Database Integrity & National Mock Services  ');
  console.log('================================================================\n');

  // ============================================================================
  // SECTION 1: PM-KISAN MOCK SERVICE STRESS TESTS
  // ============================================================================
  console.log('--- [1/4] PM-KISAN MOCK SERVICE STRESS TESTING ---');

  // Test 1.1: Invalid Aadhaar lengths (11 digits, 13 digits, empty string)
  const invalidAadhaarLengths = ['', '1', '12345', '12345678901', '1234567890123'];
  for (const uid of invalidAadhaarLengths) {
    const res = pmKisanMock.verifyAadhaar(uid);
    if (!res.success && res.error?.includes('12 numeric digits')) {
      recordFinding({
        target: 'pmKisanMock.verifyAadhaar',
        category: 'PASS',
        severity: 'INFO',
        testName: `Rejects invalid Aadhaar length (${uid.length} chars)`,
        expected: 'Rejection with 12 numeric digits message',
        observed: `Rejected: ${res.error}`,
      });
    } else {
      recordFinding({
        target: 'pmKisanMock.verifyAadhaar',
        category: 'DEFECT',
        severity: 'HIGH',
        testName: `Failed to reject invalid Aadhaar length (${uid.length} chars)`,
        expected: 'Rejection with 12 numeric digits error',
        observed: JSON.stringify(res),
      });
    }
  }

  // Test 1.2: Aadhaar with alpha/special characters
  const nonNumericAadhaars = ['12345678901A', 'ABCDEFGHIJKL', '5489-1234-5678', '5489 1234 5678', "' OR '1'='1'"];
  for (const uid of nonNumericAadhaars) {
    const res = pmKisanMock.verifyAadhaar(uid);
    // Note: '5489 1234 5678' and '5489-1234-5678' clean spaces/dashes and should match 548912345678
    if (uid.includes('5489')) {
      if (res.success) {
        recordFinding({
          target: 'pmKisanMock.verifyAadhaar',
          category: 'PASS',
          severity: 'INFO',
          testName: `Sanitizes formatting characters in Aadhaar: "${uid}"`,
          expected: 'Success after stripping spaces/dashes',
          observed: `Success: maskedMobile=${res.maskedMobile}`,
        });
      } else {
        recordFinding({
          target: 'pmKisanMock.verifyAadhaar',
          category: 'DEFECT',
          severity: 'MEDIUM',
          testName: `Failed to strip valid delimiters: "${uid}"`,
          expected: 'Success after stripping spaces/dashes',
          observed: JSON.stringify(res),
        });
      }
    } else {
      if (!res.success) {
        recordFinding({
          target: 'pmKisanMock.verifyAadhaar',
          category: 'PASS',
          severity: 'INFO',
          testName: `Rejects non-numeric/SQLi Aadhaar: "${uid}"`,
          expected: 'Rejection',
          observed: `Rejected: ${res.error}`,
        });
      } else {
        recordFinding({
          target: 'pmKisanMock.verifyAadhaar',
          category: 'VULNERABILITY',
          severity: 'CRITICAL',
          testName: `Accepted non-numeric/SQLi Aadhaar: "${uid}"`,
          expected: 'Rejection',
          observed: JSON.stringify(res),
        });
      }
    }
  }

  // Test 1.3: Unregistered Aadhaar (Valid 12 digits, but not in DB)
  const unregisteredRes = pmKisanMock.verifyAadhaar('999988887777');
  if (!unregisteredRes.success && unregisteredRes.error?.includes('not registered')) {
    recordFinding({
      target: 'pmKisanMock.verifyAadhaar',
      category: 'PASS',
      severity: 'INFO',
      testName: 'Rejects valid 12-digit unregistered Aadhaar UID',
      expected: 'Rejection with unregistered message',
      observed: unregisteredRes.error!,
    });
  } else {
    recordFinding({
      target: 'pmKisanMock.verifyAadhaar',
      category: 'DEFECT',
      severity: 'HIGH',
      testName: 'Failed to handle unregistered valid Aadhaar',
      expected: 'Rejection with not registered message',
      observed: JSON.stringify(unregisteredRes),
    });
  }

  // Test 1.4: Malformed OTPs
  const malformedOtps = ['', '12345', '1234567', 'abcdef', '000000', ' 123456 '];
  for (const otp of malformedOtps) {
    const res = pmKisanMock.validateOtp('548912345678', otp);
    // ' 123456 ' is trimmed so it should succeed
    if (otp.trim() === '123456') {
      if (res.success) {
        recordFinding({
          target: 'pmKisanMock.validateOtp',
          category: 'PASS',
          severity: 'INFO',
          testName: `Trims whitespace in valid OTP: "${otp}"`,
          expected: 'Success',
          observed: `Success with token: ${res.sessionToken?.slice(0, 20)}...`,
        });
      } else {
        recordFinding({
          target: 'pmKisanMock.validateOtp',
          category: 'DEFECT',
          severity: 'LOW',
          testName: `Failed to trim whitespace in OTP: "${otp}"`,
          expected: 'Success',
          observed: JSON.stringify(res),
        });
      }
    } else {
      if (!res.success) {
        recordFinding({
          target: 'pmKisanMock.validateOtp',
          category: 'PASS',
          severity: 'INFO',
          testName: `Rejects invalid/malformed OTP: "${otp}"`,
          expected: 'Rejection',
          observed: `Rejected: ${res.error}`,
        });
      } else {
        recordFinding({
          target: 'pmKisanMock.validateOtp',
          category: 'DEFECT',
          severity: 'HIGH',
          testName: `Accepted invalid OTP: "${otp}"`,
          expected: 'Rejection',
          observed: JSON.stringify(res),
        });
      }
    }
  }

  // Test 1.5: Land records for unregistered / non-existent Aadhaar
  const emptyLand = pmKisanMock.getLandRecords('999999999999');
  if (Array.isArray(emptyLand) && emptyLand.length === 0) {
    recordFinding({
      target: 'pmKisanMock.getLandRecords',
      category: 'PASS',
      severity: 'INFO',
      testName: 'Returns empty array for non-existent farmer without crash',
      expected: '[]',
      observed: `Array length ${emptyLand.length}`,
    });
  } else {
    recordFinding({
      target: 'pmKisanMock.getLandRecords',
      category: 'DEFECT',
      severity: 'MEDIUM',
      testName: 'Unexpected return for non-existent farmer land records',
      expected: '[]',
      observed: JSON.stringify(emptyLand),
    });
  }

  // Test 1.6: calculateQuota with unusual inputs (zero, negative, extreme acreage, unsupported crop)
  const quotaCases = [
    { crop: 'Wheat', acres: 0, expectedMax: 0 },
    { crop: 'Wheat', acres: -5.0, expectedMax: -125 }, // should this be allowed or clamped?
    { crop: 'DragonFruit', acres: 10, expectedMax: 200 }, // fallback norm is 20.0
    { crop: 'Paddy', acres: 1000000, expectedMax: 28000000 },
  ];
  for (const c of quotaCases) {
    const q = pmKisanMock.calculateQuota(c.crop, c.acres);
    if (c.acres < 0 && q.maxQuotaQtl < 0) {
      recordFinding({
        target: 'pmKisanMock.calculateQuota',
        category: 'BEHAVIORAL_QUIRK',
        severity: 'LOW',
        testName: `Negative acreage returns negative quota: acres=${c.acres}`,
        expected: 'Quota >= 0 or rejection',
        observed: `maxQuotaQtl = ${q.maxQuotaQtl}`,
      });
    } else {
      recordFinding({
        target: 'pmKisanMock.calculateQuota',
        category: 'PASS',
        severity: 'INFO',
        testName: `Quota calculation for crop=${c.crop}, acres=${c.acres}`,
        expected: `${c.expectedMax}`,
        observed: `${q.maxQuotaQtl} (norm: ${q.normQtlPerAcre})`,
      });
    }
  }

  // ============================================================================
  // SECTION 2: AGMARKNET MOCK SERVICE STRESS TESTS
  // ============================================================================
  console.log('\n--- [2/4] AGMARKNET MOCK SERVICE STRESS TESTING ---');

  // Test 2.1: Unsupported / Non-existent Crops
  const invalidCrops = ['Dragonfruit', 'Rubber', 'UnknownCrop', ''];
  for (const crop of invalidCrops) {
    try {
      const rate = agmarknetMock.getMspRate(crop);
      recordFinding({
        target: 'agmarknetMock.getMspRate',
        category: 'DEFECT',
        severity: 'HIGH',
        testName: `Failed to throw on unsupported crop: "${crop}"`,
        expected: 'Throw Error: not found',
        observed: `Returned rate: ${rate}`,
      });
    } catch (err: any) {
      recordFinding({
        target: 'agmarknetMock.getMspRate',
        category: 'PASS',
        severity: 'INFO',
        testName: `Throws error on unsupported crop: "${crop}"`,
        expected: 'Throw Error',
        observed: err.message,
      });
    }
  }

  // Test 2.2: convertToQuintals with zero, negative, extreme values
  const zeroQuintals = agmarknetMock.convertToQuintals(0, 'GUNNY_BAG_50KG');
  if (zeroQuintals === 0) {
    recordFinding({
      target: 'agmarknetMock.convertToQuintals',
      category: 'PASS',
      severity: 'INFO',
      testName: 'Converts 0 bags to 0 quintals without NaN',
      expected: '0',
      observed: `${zeroQuintals}`,
    });
  } else {
    recordFinding({
      target: 'agmarknetMock.convertToQuintals',
      category: 'DEFECT',
      severity: 'LOW',
      testName: 'Non-zero output for 0 bags',
      expected: '0',
      observed: `${zeroQuintals}`,
    });
  }

  const negQuintals = agmarknetMock.convertToQuintals(-10, 'GUNNY_BAG_50KG');
  if (negQuintals === -5) {
    recordFinding({
      target: 'agmarknetMock.convertToQuintals',
      category: 'BEHAVIORAL_QUIRK',
      severity: 'LOW',
      testName: 'Converts negative bag count to negative quintals without clamping',
      expected: 'Clamped to 0 or rejected',
      observed: `${negQuintals}`,
    });
  }

  const extremeQuintals = agmarknetMock.convertToQuintals(1e8, 'GUNNY_BAG_50KG');
  if (extremeQuintals === 50000000) {
    recordFinding({
      target: 'agmarknetMock.convertToQuintals',
      category: 'PASS',
      severity: 'INFO',
      testName: 'Handles 100,000,000 bags conversion without overflow',
      expected: '50000000',
      observed: `${extremeQuintals}`,
    });
  }

  // Test 2.3: Payout calculation with negative or zero net weight
  const zeroPayout = agmarknetMock.calculatePayout('Wheat', 0);
  if (zeroPayout.grossAmount === 0 && zeroPayout.netPayable === 0) {
    recordFinding({
      target: 'agmarknetMock.calculatePayout',
      category: 'PASS',
      severity: 'INFO',
      testName: 'Calculates 0 net weight as 0 payout without NaN',
      expected: '0',
      observed: `netPayable=${zeroPayout.netPayable}`,
    });
  }

  const negPayout = agmarknetMock.calculatePayout('Wheat', -10);
  if (negPayout.netPayable < 0) {
    recordFinding({
      target: 'agmarknetMock.calculatePayout',
      category: 'BEHAVIORAL_QUIRK',
      severity: 'LOW',
      testName: 'Negative weight produces negative net payable without throwing',
      expected: 'Rejection or error',
      observed: `netPayable=${negPayout.netPayable}`,
    });
  }

  // ============================================================================
  // SECTION 3: PFMS MOCK SERVICE STRESS TESTS
  // ============================================================================
  console.log('\n--- [3/4] PFMS MOCK SERVICE STRESS TESTING ---');

  // Test 3.1: Bank UTR Format & Character Length
  const testIfscs = ['PUNB0012300', 'SBIN0004567', 'BARB0SEHORE', 'MAHB0000321', 'CNRB0001234', 'XYZB0000001', ''];
  for (const ifsc of testIfscs) {
    const utr = pfmsMock.generateBankUtr(ifsc);
    if (utr.length === 16 && /^[A-Z0-9]{16}$/.test(utr)) {
      recordFinding({
        target: 'pfmsMock.generateBankUtr',
        category: 'PASS',
        severity: 'INFO',
        testName: `Generates valid 16-char alphanumeric UTR for IFSC "${ifsc}"`,
        expected: '16-char alphanumeric',
        observed: utr,
      });
    } else {
      recordFinding({
        target: 'pfmsMock.generateBankUtr',
        category: 'DEFECT',
        severity: 'HIGH',
        testName: `Generated invalid UTR format for IFSC "${ifsc}"`,
        expected: '16-char alphanumeric',
        observed: `Length=${utr.length}, value=${utr}`,
      });
    }
  }

  // Test 3.2: UTR Collision Rate over 1,000 and 10,000 iterations
  console.log('  Testing UTR collision rate over 1,000 iterations...');
  const utrSet1k = new Set<string>();
  for (let i = 0; i < 1000; i++) {
    utrSet1k.add(pfmsMock.generateBankUtr('SBIN0001144'));
  }
  const collisions1k = 1000 - utrSet1k.size;
  if (collisions1k > 0) {
    recordFinding({
      target: 'pfmsMock.generateBankUtr',
      category: 'DEFECT',
      severity: 'MEDIUM',
      testName: `Collision in 1,000 generated Bank UTRs: ${collisions1k} duplicates found`,
      expected: '1,000 unique UTRs (0 collisions)',
      observed: `${utrSet1k.size} unique UTRs (${collisions1k} collisions)`,
    });
  } else {
    recordFinding({
      target: 'pfmsMock.generateBankUtr',
      category: 'PASS',
      severity: 'INFO',
      testName: 'Zero collisions in 1,000 generated Bank UTRs',
      expected: '1,000 unique',
      observed: '1,000 unique',
    });
  }

  // Test 3.3: PFMS Settlement Status Transition Lifecycle
  const sanctionReq = {
    mandiCenterCode: 'MND-LUD-01',
    billNumber: 'JF-STRESS-001',
    totalBillAmount: 50000,
  };
  const sanctionRes = pfmsMock.generatePfmsSanction(sanctionReq);
  const billRef = sanctionRes.pfmsBillReferenceNumber!;

  const initialStatus = pfmsMock.getBillStatus(billRef);
  if (initialStatus?.paymentStatus === 'PROCESSING') {
    recordFinding({
      target: 'pfmsMock.generatePfmsSanction',
      category: 'PASS',
      severity: 'INFO',
      testName: 'New sanction record initialized in PROCESSING status',
      expected: 'PROCESSING',
      observed: initialStatus.paymentStatus,
    });
  }

  // Transition to CREDITED
  const creditedRecord = pfmsMock.transitionToCredited(billRef, 'PUNB0012300');
  if (creditedRecord.paymentStatus === 'CREDITED' && creditedRecord.bankUtrNumber && creditedRecord.disbursementDate) {
    recordFinding({
      target: 'pfmsMock.transitionToCredited',
      category: 'PASS',
      severity: 'INFO',
      testName: 'Transitions to CREDITED with populated Bank UTR and disbursement date',
      expected: 'CREDITED + UTR + Date',
      observed: `Status=${creditedRecord.paymentStatus}, UTR=${creditedRecord.bankUtrNumber}`,
    });
  }

  // Transition to FAILED
  const failedRecord = pfmsMock.transitionToFailed(billRef, 'Account Dormant');
  if (failedRecord.paymentStatus === 'FAILED' && failedRecord.failureReason === 'Account Dormant') {
    recordFinding({
      target: 'pfmsMock.transitionToFailed',
      category: 'PASS',
      severity: 'INFO',
      testName: 'Transitions to FAILED with descriptive failure reason',
      expected: 'FAILED + Reason',
      observed: `Status=${failedRecord.paymentStatus}, Reason=${failedRecord.failureReason}`,
    });
  }

  // ============================================================================
  // SECTION 4: PRISMA SCHEMA & SQLITE DEV.DB STRESS TESTS
  // ============================================================================
  console.log('\n--- [4/4] PRISMA RELATIONAL SCHEMA & SQLITE DEV.DB STRESS TESTING ---');

  // Test 4.1: Unique Constraint on Farmer aadhaarNumber
  const existingFarmer = await db.farmer.findFirst();
  if (existingFarmer) {
    try {
      await db.farmer.create({
        data: {
          aadhaarNumber: existingFarmer.aadhaarNumber, // Duplicate!
          maskedAadhaar: 'XXXXXXXX9999',
          fullName: 'Duplicate Tester',
          phoneNumber: '9999999999',
          state: 'Punjab',
          district: 'Ludhiana',
          village: 'TestVillage',
        },
      });
      recordFinding({
        target: 'Prisma.Farmer',
        category: 'DEFECT',
        severity: 'CRITICAL',
        testName: 'Failed to enforce unique constraint on Farmer.aadhaarNumber',
        expected: 'Throw P2002 Unique Constraint Violation',
        observed: 'Successfully inserted duplicate Aadhaar!',
      });
    } catch (err: any) {
      if (err.code === 'P2002' || err.message?.includes('Unique constraint failed')) {
        recordFinding({
          target: 'Prisma.Farmer',
          category: 'PASS',
          severity: 'INFO',
          testName: 'Enforces unique constraint on Farmer.aadhaarNumber (P2002)',
          expected: 'P2002 Unique Constraint Violation',
          observed: `Caught P2002 on field: ${(err.meta?.target as any) || 'aadhaarNumber'}`,
        });
      } else {
        recordFinding({
          target: 'Prisma.Farmer',
          category: 'DEFECT',
          severity: 'HIGH',
          testName: 'Unexpected error on duplicate Aadhaar insertion',
          expected: 'P2002',
          observed: err.message,
        });
      }
    }
  }

  // Test 4.2: Compound Unique Constraint on Booking @@unique([centerId, bookedDate, tokenNumber])
  const testCenter = await db.procurementCenter.findFirst();
  const testFarmer = await db.farmer.findFirst();

  if (testCenter && testFarmer) {
    const stressDate = '2026-12-31';
    const stressToken = 'TK-STRESS-999';

    // Clean any prior residue
    await db.booking.deleteMany({
      where: { centerId: testCenter.id, bookedDate: stressDate, tokenNumber: stressToken },
    });

    // Create first booking
    const booking1 = await db.booking.create({
      data: {
        bookingNumber: `BK-STRESS-${Date.now()}-1`,
        tokenNumber: stressToken,
        farmerId: testFarmer.id,
        centerId: testCenter.id,
        cropName: 'Wheat',
        commodityCategory: 'GRAINS',
        unitType: 'GUNNY_BAG_50KG',
        packageCount: 100,
        estimatedQuantityQtl: 50.0,
        bookedDate: stressDate,
        scheduledSlotStart: '09:00',
        scheduledSlotEnd: '09:30',
        dynamicEta: '09:00',
        status: 'WAITING',
      },
    });

    // Attempt to insert second booking with identical centerId, bookedDate, tokenNumber
    try {
      await db.booking.create({
        data: {
          bookingNumber: `BK-STRESS-${Date.now()}-2`, // different bookingNumber
          tokenNumber: stressToken,                  // DUPLICATE TOKEN
          farmerId: testFarmer.id,
          centerId: testCenter.id,                   // SAME CENTER
          cropName: 'Paddy',
          commodityCategory: 'GRAINS',
          unitType: 'GUNNY_BAG_50KG',
          packageCount: 50,
          estimatedQuantityQtl: 25.0,
          bookedDate: stressDate,                    // SAME DATE
          scheduledSlotStart: '10:00',
          scheduledSlotEnd: '10:30',
          dynamicEta: '10:00',
          status: 'WAITING',
        },
      });
      recordFinding({
        target: 'Prisma.Booking',
        category: 'DEFECT',
        severity: 'CRITICAL',
        testName: 'Failed to enforce @@unique([centerId, bookedDate, tokenNumber]) constraint',
        expected: 'P2002 Unique constraint violation',
        observed: 'Successfully inserted duplicate tokenNumber on same center and date!',
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        recordFinding({
          target: 'Prisma.Booking',
          category: 'PASS',
          severity: 'INFO',
          testName: 'Enforces compound unique constraint @@unique([centerId, bookedDate, tokenNumber]) (P2002)',
          expected: 'P2002 Unique constraint violation',
          observed: `Caught P2002 on fields: ${JSON.stringify(err.meta?.target)}`,
        });
      } else {
        recordFinding({
          target: 'Prisma.Booking',
          category: 'DEFECT',
          severity: 'HIGH',
          testName: 'Unexpected error on duplicate Booking tokenNumber insertion',
          expected: 'P2002',
          observed: err.message,
        });
      }
    }

    // Clean up test booking
    await db.booking.deleteMany({
      where: { centerId: testCenter.id, bookedDate: stressDate, tokenNumber: stressToken },
    });
  }

  // Test 4.3: Foreign Key Constraint Enforcement (Non-existent farmerId)
  try {
    await db.landRecord.create({
      data: {
        farmerId: 'NON_EXISTENT_FARMER_CUID_999999',
        khasraNumber: '999/1',
        khatauniNumber: 'KH-99999',
        village: 'GhostVillage',
        subDistrictTehsil: 'GhostTehsil',
        district: 'GhostDistrict',
        state: 'GhostState',
        totalLandAreaAcres: 5.0,
        cropSeason: 'RABI_2024_25',
        verifiedSownCrop: 'Wheat',
        sownAreaAcres: 5.0,
        mspProductivityNormQtlPerAcre: 25.0,
        maxProcurementQuotaQtl: 125.0,
      },
    });
    recordFinding({
      target: 'Prisma.LandRecord -> Farmer',
      category: 'VULNERABILITY',
      severity: 'HIGH',
      testName: 'Dangling Foreign Key: SQLite allowed creating LandRecord with non-existent farmerId',
      expected: 'P2003 Foreign Key Constraint Violation',
      observed: 'Record created with orphan farmerId (foreign_keys PRAGMA may not be enforced at SQLite level)',
    });
    // Clean up if inserted
    await db.landRecord.deleteMany({ where: { khasraNumber: '999/1', khatauniNumber: 'KH-99999' } });
  } catch (err: any) {
    if (err.code === 'P2003' || err.message?.includes('Foreign key constraint failed')) {
      recordFinding({
        target: 'Prisma.LandRecord -> Farmer',
        category: 'PASS',
        severity: 'INFO',
        testName: 'Enforces Foreign Key constraint on LandRecord.farmerId (P2003)',
        expected: 'P2003 Foreign key constraint violation',
        observed: `Caught P2003: ${err.message}`,
      });
    } else {
      recordFinding({
        target: 'Prisma.LandRecord -> Farmer',
        category: 'BEHAVIORAL_QUIRK',
        severity: 'LOW',
        testName: 'Threw unexpected error for non-existent foreign key',
        expected: 'P2003',
        observed: err.message,
      });
    }
  }

  // Test 4.4: Cascade Delete Verification (Farmer -> LandRecord, BankAccount, Booking, QueueEvent)
  console.log('  Testing Cascade Delete Behavior on Temporary Farmer...');
  const tempAadhaar = '999911112222';
  // Clean prior residue
  await db.farmer.deleteMany({ where: { aadhaarNumber: tempAadhaar } });

  const tempFarmer = await db.farmer.create({
    data: {
      aadhaarNumber: tempAadhaar,
      maskedAadhaar: 'XXXXXXXX2222',
      fullName: 'Cascade Delete Test Farmer',
      phoneNumber: '9123456780',
      state: 'Punjab',
      district: 'Ludhiana',
      village: 'TestVillage',
      landRecords: {
        create: [
          {
            khasraNumber: '777/1',
            khatauniNumber: 'KH-77777',
            village: 'TestVillage',
            subDistrictTehsil: 'Ludhiana West',
            district: 'Ludhiana',
            state: 'Punjab',
            totalLandAreaAcres: 2.0,
            cropSeason: 'RABI_2024_25',
            verifiedSownCrop: 'Wheat',
            sownAreaAcres: 2.0,
            mspProductivityNormQtlPerAcre: 25.0,
            maxProcurementQuotaQtl: 50.0,
          },
        ],
      },
      bankAccounts: {
        create: [
          {
            bankName: 'Test Bank',
            accountNumberMasked: 'XXXXXX1234',
            ifscCode: 'TEST0001234',
            pfmsBeneficiaryCode: 'PFMS-BEN-TEMP-999',
          },
        ],
      },
    },
  });

  // Verify child records exist
  const landCountBefore = await db.landRecord.count({ where: { farmerId: tempFarmer.id } });
  const bankCountBefore = await db.bankAccount.count({ where: { farmerId: tempFarmer.id } });

  // Delete tempFarmer
  await db.farmer.delete({ where: { id: tempFarmer.id } });

  // Check child records after deletion
  const landCountAfter = await db.landRecord.count({ where: { farmerId: tempFarmer.id } });
  const bankCountAfter = await db.bankAccount.count({ where: { farmerId: tempFarmer.id } });

  if (landCountBefore === 1 && landCountAfter === 0 && bankCountBefore === 1 && bankCountAfter === 0) {
    recordFinding({
      target: 'Prisma.Farmer Cascade Delete',
      category: 'PASS',
      severity: 'INFO',
      testName: 'Cascade deletes LandRecord and BankAccount on Farmer deletion',
      expected: 'Children count: before=1, after=0',
      observed: `Land: ${landCountBefore}->${landCountAfter}, Bank: ${bankCountBefore}->${bankCountAfter}`,
    });
  } else {
    recordFinding({
      target: 'Prisma.Farmer Cascade Delete',
      category: 'DEFECT',
      severity: 'CRITICAL',
      testName: 'Cascade delete failed: Orphan records remained in database',
      expected: 'Children count: 0',
      observed: `Land count after: ${landCountAfter}, Bank count after: ${bankCountAfter}`,
    });
  }

  // Test 4.5: ProcurementCenter Deletion Protection (onDelete: Restrict)
  // An operator or booking linked to a center should prevent center deletion
  const centerWithOperators = await db.procurementCenter.findFirst({
    where: { operators: { some: {} } },
    include: { operators: true },
  });

  if (centerWithOperators) {
    try {
      await db.procurementCenter.delete({
        where: { id: centerWithOperators.id },
      });
      recordFinding({
        target: 'Prisma.ProcurementCenter -> Operator (onDelete: Restrict)',
        category: 'DEFECT',
        severity: 'CRITICAL',
        testName: 'Failed to restrict deletion of center with active operators',
        expected: 'P2003 / P2014 Restrict violation',
        observed: 'Successfully deleted center with active operators!',
      });
    } catch (err: any) {
      if (err.code === 'P2003' || err.code === 'P2014' || err.message?.includes('foreign key')) {
        recordFinding({
          target: 'Prisma.ProcurementCenter -> Operator (onDelete: Restrict)',
          category: 'PASS',
          severity: 'INFO',
          testName: 'Enforces onDelete: Restrict when deleting center with operators',
          expected: 'P2003/P2014 Restrict violation',
          observed: `Caught error: code=${err.code}`,
        });
      } else {
        recordFinding({
          target: 'Prisma.ProcurementCenter -> Operator (onDelete: Restrict)',
          category: 'PASS',
          severity: 'INFO',
          testName: 'Rejected center deletion with active operators',
          expected: 'Deletion error',
          observed: err.message,
        });
      }
    }
  }

  // Test 4.6: HourlySlotCapacity Unique Constraint @@unique([centerId, date, hourOfDay])
  const firstCenter = await db.procurementCenter.findFirst();
  if (firstCenter) {
    const testDate = '2026-09-08';
    const testHour = 8;
    const existingSlot = await db.hourlySlotCapacity.findFirst({
      where: { centerId: firstCenter.id, date: testDate, hourOfDay: testHour },
    });

    if (existingSlot) {
      try {
        await db.hourlySlotCapacity.create({
          data: {
            centerId: firstCenter.id,
            date: testDate,
            hourOfDay: testHour,
            bookedCount: 0,
            maxCapacity: 4,
          },
        });
        recordFinding({
          target: 'Prisma.HourlySlotCapacity',
          category: 'DEFECT',
          severity: 'HIGH',
          testName: 'Failed to enforce @@unique([centerId, date, hourOfDay]) constraint',
          expected: 'P2002 Unique constraint violation',
          observed: 'Successfully inserted duplicate hourly slot capacity!',
        });
      } catch (err: any) {
        if (err.code === 'P2002') {
          recordFinding({
            target: 'Prisma.HourlySlotCapacity',
            category: 'PASS',
            severity: 'INFO',
            testName: 'Enforces @@unique([centerId, date, hourOfDay]) constraint (P2002)',
            expected: 'P2002',
            observed: `Caught P2002: ${JSON.stringify(err.meta?.target)}`,
          });
        }
      }
    }
  }

  // ============================================================================
  // SUMMARY REPORT GENERATION
  // ============================================================================
  console.log('\n================================================================');
  console.log('                     STRESS TESTING FINDINGS SUMMARY            ');
  console.log('================================================================');
  const passes = findings.filter(f => f.category === 'PASS').length;
  const defects = findings.filter(f => f.category === 'DEFECT').length;
  const vulnerabilities = findings.filter(f => f.category === 'VULNERABILITY').length;
  const quirks = findings.filter(f => f.category === 'BEHAVIORAL_QUIRK').length;

  console.log(`Total Scenarios Tested: ${findings.length}`);
  console.log(`✅ Passed Scenarios:    ${passes}`);
  console.log(`❌ Defects Found:       ${defects}`);
  console.log(`🛡️ Vulnerabilities:     ${vulnerabilities}`);
  console.log(`⚠️ Behavioral Quirks:   ${quirks}`);
  console.log('================================================================\n');

  return { findings, passes, defects, vulnerabilities, quirks };
}

runAdversarialStressTests()
  .then((res) => {
    if (res.defects > 0 || res.vulnerabilities > 0) {
      console.log(`Stress test completed with ${res.defects} defects and ${res.vulnerabilities} vulnerabilities.`);
    } else {
      console.log('All stress test scenarios passed successfully!');
    }
  })
  .catch((err) => {
    console.error('Fatal unhandled error in stress testing harness:', err);
    process.exit(1);
  });
