/**
 * scripts/empirical_challenge_m1_it2.ts
 * Empirical Adversarial Challenger Suite for Milestone 1 Iteration 2.
 * Validates:
 * 1. agmarknetMock.getCrop and getMspRate with empty string, whitespace, short substrings, invalid types
 * 2. High-frequency UTR collision resistance across 10,000+ iterations (pfmsMock and DomainEngine)
 * 3. AssertionProxy: .not.toBe(), .not.toEqual(), toBeUndefined(), .not.toBeUndefined(), and edge cases
 */

import { agmarknetMock } from '../src/lib/mocks/agmarknet';
import { pfmsMock } from '../src/lib/mocks/pfms';
import { DomainEngine } from '../tests/helpers/domain_engine';
import { expect, AssertionProxy } from '../tests/helpers/test_runner';

interface ChallengeResult {
  challengeId: string;
  name: string;
  passed: boolean;
  expected: string;
  observed: string;
  details?: any;
}

const results: ChallengeResult[] = [];

function record(res: ChallengeResult) {
  results.push(res);
  const icon = res.passed ? '✅' : '❌';
  console.log(`${icon} [${res.challengeId}] ${res.name}`);
  if (!res.passed) {
    console.log(`   Expected: ${res.expected}`);
    console.log(`   Observed: ${res.observed}`);
  }
}

async function runEmpiricalChallenges() {
  console.log('================================================================');
  console.log('     EMPIRICAL ADVERSARIAL CHALLENGER: MILESTONE 1 ITERATION 2  ');
  console.log('================================================================\n');

  // ============================================================================
  // CHALLENGE 1: AGMARKNET CROP QUERY MATCHING & BOUNDARIES
  // ============================================================================
  console.log('--- [Challenge 1/3] agmarknetMock.getCrop & getMspRate Robustness ---');

  // 1.1 Empty string input to getCrop
  const cropEmpty = agmarknetMock.getCrop('');
  record({
    challengeId: 'CH-AGM-01',
    name: 'agmarknetMock.getCrop("") returns undefined (does NOT match Wheat)',
    passed: cropEmpty === undefined,
    expected: 'undefined',
    observed: cropEmpty ? `Matched ${cropEmpty.nameEn} (${cropEmpty.id})` : 'undefined',
  });

  // 1.2 Whitespace strings to getCrop
  const whitespaceInputs = [' ', '   ', '\t', '\n', '  \t \n '];
  let whitespaceClean = true;
  let whitespaceFailReason = '';
  for (const ws of whitespaceInputs) {
    const res = agmarknetMock.getCrop(ws);
    if (res !== undefined) {
      whitespaceClean = false;
      whitespaceFailReason = `Input "${escape(ws)}" matched ${res.nameEn}`;
      break;
    }
  }
  record({
    challengeId: 'CH-AGM-02',
    name: 'agmarknetMock.getCrop rejects all whitespace variations as undefined',
    passed: whitespaceClean,
    expected: 'All whitespace variations return undefined',
    observed: whitespaceClean ? 'All 5 whitespace variations returned undefined' : whitespaceFailReason,
  });

  // 1.3 Substring length boundary (< 3 chars vs >= 3 chars)
  const sub1 = agmarknetMock.getCrop('W');
  const sub2 = agmarknetMock.getCrop('Wh');
  const sub3 = agmarknetMock.getCrop('Whe');
  const sub4 = agmarknetMock.getCrop('Wheat');
  const subBoundPass = sub1 === undefined && sub2 === undefined && sub3 !== undefined && sub3.commodityKey === 'WHEAT' && sub4 !== undefined && sub4.commodityKey === 'WHEAT';
  record({
    challengeId: 'CH-AGM-03',
    name: 'agmarknetMock.getCrop enforces >=3 char threshold for substring matching',
    passed: subBoundPass,
    expected: 'getCrop("W")=undefined, getCrop("Wh")=undefined, getCrop("Whe")=Wheat',
    observed: `W: ${sub1 ? sub1.nameEn : 'undefined'}, Wh: ${sub2 ? sub2.nameEn : 'undefined'}, Whe: ${sub3 ? sub3.nameEn : 'undefined'}, Wheat: ${sub4 ? sub4.nameEn : 'undefined'}`,
  });

  // 1.4 Invalid / non-existent crops
  const invalidQueries = ['Dragonfruit', 'Avocado', 'NonExistentGrain', 'Random123XYZ', 'WheatFake'];
  let invalidClean = true;
  for (const inv of invalidQueries) {
    const res = agmarknetMock.getCrop(inv);
    if (res !== undefined) {
      invalidClean = false;
      break;
    }
  }
  record({
    challengeId: 'CH-AGM-04',
    name: 'agmarknetMock.getCrop returns undefined for invalid/unregistered crop queries',
    passed: invalidClean,
    expected: 'undefined for all invalid queries',
    observed: invalidClean ? 'All invalid queries returned undefined' : 'Matched unexpected crop',
  });

  // 1.5 Non-string inputs
  const nonStringInputs = [null as any, undefined as any, 12345 as any, {} as any, [] as any];
  let nonStringClean = true;
  for (const nsi of nonStringInputs) {
    const res = agmarknetMock.getCrop(nsi);
    if (res !== undefined) {
      nonStringClean = false;
      break;
    }
  }
  record({
    challengeId: 'CH-AGM-05',
    name: 'agmarknetMock.getCrop safely handles null/undefined/non-string types',
    passed: nonStringClean,
    expected: 'undefined for all non-string inputs',
    observed: nonStringClean ? 'All non-string inputs safely returned undefined without throwing' : 'Unexpected behavior',
  });

  // 1.6 getMspRate with empty string and whitespace throws descriptive Error
  let mspEmptyThrew = false;
  let mspEmptyErrorMsg = '';
  try {
    agmarknetMock.getMspRate('');
  } catch (e: any) {
    mspEmptyThrew = true;
    mspEmptyErrorMsg = e.message;
  }
  record({
    challengeId: 'CH-AGM-06',
    name: 'agmarknetMock.getMspRate("") throws descriptive Error',
    passed: mspEmptyThrew && mspEmptyErrorMsg.includes('not found in Agmarknet CACP database'),
    expected: 'Throws Error mentioning crop not found',
    observed: mspEmptyThrew ? `Threw: "${mspEmptyErrorMsg}"` : 'Did not throw',
  });

  let mspWsThrew = false;
  try {
    agmarknetMock.getMspRate('   ');
  } catch (e: any) {
    mspWsThrew = true;
  }
  record({
    challengeId: 'CH-AGM-07',
    name: 'agmarknetMock.getMspRate("   ") throws Error for whitespace query',
    passed: mspWsThrew,
    expected: 'Throws Error',
    observed: mspWsThrew ? 'Threw Error as expected' : 'Did not throw',
  });

  // 1.7 Regional Language Exact Matching
  const hindiWheat = agmarknetMock.getCrop('गेहूं');
  const teluguPaddy = agmarknetMock.getCrop('వరి');
  record({
    challengeId: 'CH-AGM-08',
    name: 'agmarknetMock.getCrop matches regional language names (Hindi, Telugu)',
    passed: hindiWheat?.commodityKey === 'WHEAT' && teluguPaddy?.commodityKey === 'PADDY',
    expected: 'गेहूं -> WHEAT, వరి -> PADDY',
    observed: `गेहूं -> ${hindiWheat?.commodityKey}, వరి -> ${teluguPaddy?.commodityKey}`,
  });


  // ============================================================================
  // CHALLENGE 2: UTR HIGH-FREQUENCY GENERATION & COLLISION RESISTANCE
  // ============================================================================
  console.log('\n--- [Challenge 2/3] UTR Collision Resistance (10,000 Iterations) ---');

  // 2.1 pfmsMock.generateBankUtr: 10,000 iterations in tight synchronous loop
  console.log('  Generating 10,000 UTRs via pfmsMock.generateBankUtr...');
  const pfmsUtrSet = new Set<string>();
  const ifscSample = ['PUNB0012300', 'SBIN0001144', 'BARB0SEHORE', 'MAHB0000321', 'CNRB0001234'];
  const startPfms = Date.now();
  let invalidFormatCount = 0;

  for (let i = 0; i < 10000; i++) {
    const ifsc = ifscSample[i % ifscSample.length];
    const utr = pfmsMock.generateBankUtr(ifsc);
    if (utr.length !== 16 || !/^[A-Z0-9]{16}$/.test(utr)) {
      invalidFormatCount++;
    }
    pfmsUtrSet.add(utr);
  }
  const pfmsDuration = Date.now() - startPfms;
  const pfmsCollisions = 10000 - pfmsUtrSet.size;

  record({
    challengeId: 'CH-UTR-01',
    name: 'pfmsMock.generateBankUtr produces 0 collisions across 10,000 high-frequency iterations',
    passed: pfmsCollisions === 0 && invalidFormatCount === 0,
    expected: '10,000 unique UTRs, 0 collisions, 0 invalid formats',
    observed: `${pfmsUtrSet.size} unique UTRs (${pfmsCollisions} collisions, ${invalidFormatCount} invalid formats) in ${pfmsDuration}ms`,
  });

  // 2.2 DomainEngine.settleDbtCredit: 10,000 iterations in tight loop
  console.log('  Generating 10,000 UTRs via DomainEngine.settleDbtCredit...');
  const domainUtrSet = new Set<string>();
  let domainInvalidCount = 0;
  const startDomain = Date.now();

  const dummyPayment = {
    paymentId: 'PAY_TEST_001',
    jFormSerialNumber: 'JF-2026-LUD-01-001',
    farmerId: 'FARMER_001',
    amount: 50000,
    status: 'PROCESSING' as const,
    pfmsBillReference: 'PFMS-2026-DOCA-12345',
    bankName: 'Punjab National Bank',
    accountNumberMasked: 'XXXXXX4512',
    ifscCode: 'PUNB0012300',
  };

  for (let i = 0; i < 10000; i++) {
    const settled = DomainEngine.settleDbtCredit({
      ...dummyPayment,
      paymentId: `PAY_TEST_${i}`,
    });
    const utr = settled.bankUtrNumber || '';
    if (!/^UTR\d{12}$/.test(utr)) {
      domainInvalidCount++;
    }
    domainUtrSet.add(utr);
  }
  const domainDuration = Date.now() - startDomain;
  const domainCollisions = 10000 - domainUtrSet.size;

  record({
    challengeId: 'CH-UTR-02',
    name: 'DomainEngine.settleDbtCredit produces 0 collisions across 10,000 settlements',
    passed: domainCollisions === 0 && domainInvalidCount === 0,
    expected: '10,000 unique UTRs matching /^UTR\\d{12}$/, 0 collisions',
    observed: `${domainUtrSet.size} unique UTRs (${domainCollisions} collisions, ${domainInvalidCount} invalid format) in ${domainDuration}ms`,
  });

  // 2.3 Extended Stress: 50,000 additional UTR generations
  console.log('  Running extended stress test of 50,000 sequential UTR generations...');
  const extendedSet = new Set<string>();
  const startExt = Date.now();
  for (let i = 0; i < 50000; i++) {
    extendedSet.add(pfmsMock.generateBankUtr('SBIN0001144'));
  }
  const extDuration = Date.now() - startExt;
  const extCollisions = 50000 - extendedSet.size;
  record({
    challengeId: 'CH-UTR-03',
    name: 'Extended 50,000 UTR generation stress test shows zero collisions',
    passed: extCollisions === 0,
    expected: '50,000 unique UTRs (0 collisions)',
    observed: `${extendedSet.size} unique UTRs (${extCollisions} collisions) in ${extDuration}ms`,
  });


  // ============================================================================
  // CHALLENGE 3: ASSERTION PROXY MATCHER SUITE
  // ============================================================================
  console.log('\n--- [Challenge 3/3] AssertionProxy Matchers & Inversion (.not) ---');

  // 3.1 expect(a).toBe(b) and expect(a).not.toBe(b)
  let toBePass = true;
  try {
    expect(42).toBe(42);
    expect('test').toBe('test');
    expect(true).toBe(true);
  } catch {
    toBePass = false;
  }

  let notToBePass = true;
  try {
    expect(42).not.toBe(43);
    expect('test').not.toBe('other');
    expect(true).not.toBe(false);
  } catch {
    notToBePass = false;
  }

  let notToBeThrowsWhenEqual = false;
  try {
    expect('same').not.toBe('same');
  } catch (err: any) {
    notToBeThrowsWhenEqual = err.message.includes('Expected value NOT to be "same"');
  }

  let toBeThrowsWhenNotEqual = false;
  try {
    expect(10).toBe(20);
  } catch (err: any) {
    toBeThrowsWhenNotEqual = err.message.includes('Expected 20, but received 10');
  }

  record({
    challengeId: 'CH-ASP-01',
    name: 'AssertionProxy .toBe() and .not.toBe() symmetric assertion logic',
    passed: toBePass && notToBePass && notToBeThrowsWhenEqual && toBeThrowsWhenNotEqual,
    expected: 'Passes on correct assertions, throws appropriate message on incorrect assertions',
    observed: `toBePass=${toBePass}, notToBePass=${notToBePass}, notThrows=${notToBeThrowsWhenEqual}, toBeThrows=${toBeThrowsWhenNotEqual}`,
  });

  // 3.2 expect(a).toEqual(b) and expect(a).not.toEqual(b)
  let toEqualPass = true;
  try {
    expect({ x: 1, y: [2, 3] }).toEqual({ x: 1, y: [2, 3] });
  } catch {
    toEqualPass = false;
  }

  let notToEqualPass = true;
  try {
    expect({ x: 1 }).not.toEqual({ x: 2 });
  } catch {
    notToEqualPass = false;
  }

  let notToEqualThrowsWhenEqual = false;
  try {
    expect({ a: 1 }).not.toEqual({ a: 1 });
  } catch (err: any) {
    notToEqualThrowsWhenEqual = err.message.includes('Expected value NOT to equal {"a":1}');
  }

  record({
    challengeId: 'CH-ASP-02',
    name: 'AssertionProxy .toEqual() and .not.toEqual() deep JSON assertion',
    passed: toEqualPass && notToEqualPass && notToEqualThrowsWhenEqual,
    expected: 'Accurate structural comparison with proper negation inversion',
    observed: `toEqualPass=${toEqualPass}, notToEqualPass=${notToEqualPass}, notThrows=${notToEqualThrowsWhenEqual}`,
  });

  // 3.3 toBeUndefined() and .not.toBeUndefined()
  let toBeUndefPass = true;
  try {
    expect(undefined).toBeUndefined();
    let unassigned;
    expect(unassigned).toBeUndefined();
  } catch {
    toBeUndefPass = false;
  }

  let toBeUndefThrowsOnDefined = false;
  try {
    expect('defined string').toBeUndefined();
  } catch (err: any) {
    toBeUndefThrowsOnDefined = err.message.includes('Expected undefined, but received "defined string"');
  }

  let notToBeUndefPass = true;
  try {
    expect('defined').not.toBeUndefined();
    expect(null).not.toBeUndefined();
    expect(0).not.toBeUndefined();
    expect(false).not.toBeUndefined();
    expect('').not.toBeUndefined();
    expect({}).not.toBeUndefined();
  } catch {
    notToBeUndefPass = false;
  }

  let notToBeUndefThrowsOnUndef = false;
  try {
    expect(undefined).not.toBeUndefined();
  } catch (err: any) {
    notToBeUndefThrowsOnUndef = err.message.includes('Expected defined value, but received undefined');
  }

  record({
    challengeId: 'CH-ASP-03',
    name: 'AssertionProxy toBeUndefined() and .not.toBeUndefined() boundary verification',
    passed: toBeUndefPass && toBeUndefThrowsOnDefined && notToBeUndefPass && notToBeUndefThrowsOnUndef,
    expected: 'Accurately distinguishes undefined from falsy defined values (0, false, "", null, {})',
    observed: `toBeUndefPass=${toBeUndefPass}, throwsOnDefined=${toBeUndefThrowsOnDefined}, notPass=${notToBeUndefPass}, notThrows=${notToBeUndefThrowsOnUndef}`,
  });

  // 3.4 Double negation chaining (.not.not)
  let doubleNegPass = true;
  try {
    expect('active').not.not.toBe('active');
    expect(undefined).not.not.toBeUndefined();
  } catch {
    doubleNegPass = false;
  }

  let doubleNegThrowsWhenMismatch = false;
  try {
    expect('active').not.not.toBe('inactive');
  } catch {
    doubleNegThrowsWhenMismatch = true;
  }

  record({
    challengeId: 'CH-ASP-04',
    name: 'AssertionProxy supports double negation chaining (.not.not)',
    passed: doubleNegPass && doubleNegThrowsWhenMismatch,
    expected: 'Double negation toggles back to positive assertion mode',
    observed: `doubleNegPass=${doubleNegPass}, throwsMismatch=${doubleNegThrowsWhenMismatch}`,
  });

  // 3.5 Extended test: All AssertionProxy matchers in positive and negative (.not) modes
  let allMatchersPass = true;
  try {
    // toBeNull
    expect(null).toBeNull();
    expect('not null').not.toBeNull();

    // toBeTruthy / toBeFalsy
    expect('truthy').toBeTruthy();
    expect('').not.toBeTruthy();
    expect(0).toBeFalsy();
    expect(1).not.toBeFalsy();

    // Numeric comparisons
    expect(100).toBeGreaterThan(50);
    expect(50).not.toBeGreaterThan(100);
    expect(100).toBeGreaterThanOrEqual(100);
    expect(99).not.toBeGreaterThanOrEqual(100);
    expect(25).toBeLessThan(50);
    expect(50).not.toBeLessThan(25);
    expect(50).toBeLessThanOrEqual(50);
    expect(51).not.toBeLessThanOrEqual(50);

    // toBeCloseTo
    expect(0.1 + 0.2).toBeCloseTo(0.3, 5);
    expect(0.1 + 0.2).not.toBeCloseTo(0.9, 1);

    // toContain
    expect(['wheat', 'paddy', 'chana']).toContain('paddy');
    expect(['wheat', 'paddy']).not.toContain('moong');
    expect('KisanJod Digital Procurement').toContain('Digital');
    expect('KisanJod Digital Procurement').not.toContain('Bitcoin');

    // toMatch
    expect('TK-001').toMatch(/^TK-\d{3}$/);
    expect('TK-001').not.toMatch(/^JFORM/);

    // toThrow
    expect(() => { throw new Error('mandi error'); }).toThrow();
    expect(() => { return 'success'; }).not.toThrow();
  } catch (err: any) {
    allMatchersPass = false;
    console.error('Matcher failure:', err.message);
  }

  record({
    challengeId: 'CH-ASP-05',
    name: 'All AssertionProxy matchers (toBeNull, truthy/falsy, inequalities, closeTo, contain, match, throw) pass in both direct and .not modes',
    passed: allMatchersPass,
    expected: 'All matchers function symmetrically with .not',
    observed: allMatchersPass ? 'All matchers passed both positive and inverted checks' : 'One or more matchers failed',
  });

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n================================================================');
  console.log('                   CHALLENGE AUDIT SUMMARY                      ');
  console.log('================================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`Total Challenges Executed: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runEmpiricalChallenges().catch(err => {
  console.error('Unhandled fatal error in challenge harness:', err);
  process.exit(1);
});
