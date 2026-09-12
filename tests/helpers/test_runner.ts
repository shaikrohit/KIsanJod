/**
 * tests/helpers/test_runner.ts
 * Lightweight, robust, zero-dependency test framework and assertion library
 * for executing KisanJod E2E testing tiers.
 */

export interface TestCaseResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export interface TestSuiteResult {
  title: string;
  tests: TestCaseResult[];
  passedCount: number;
  failedCount: number;
  durationMs: number;
}

class TestContext {
  private currentSuiteTitle: string = '';
  private currentSuiteTests: TestCaseResult[] = [];
  public suiteResults: TestSuiteResult[] = [];

  describe(title: string, fn: () => void | Promise<void>): void {
    const prevTitle = this.currentSuiteTitle;
    const prevTests = this.currentSuiteTests;

    this.currentSuiteTitle = title;
    this.currentSuiteTests = [];

    const startTime = Date.now();
    try {
      const res = fn();
      if (res && typeof (res as any).then === 'function') {
        throw new Error(`Asynchronous describe blocks not supported. Use async inside it() instead.`);
      }
    } catch (e: any) {
      console.error(`Error in suite "${title}":`, e.message);
    }

    const durationMs = Date.now() - startTime;
    const passedCount = this.currentSuiteTests.filter(t => t.passed).length;
    const failedCount = this.currentSuiteTests.filter(t => !t.passed).length;

    this.suiteResults.push({
      title,
      tests: [...this.currentSuiteTests],
      passedCount,
      failedCount,
      durationMs,
    });

    this.currentSuiteTitle = prevTitle;
    this.currentSuiteTests = prevTests;
  }

  async it(name: string, fn: () => void | Promise<void>): Promise<void> {
    const start = Date.now();
    try {
      await fn();
      this.currentSuiteTests.push({
        name,
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (err: any) {
      this.currentSuiteTests.push({
        name,
        passed: false,
        error: err.stack || err.message || String(err),
        durationMs: Date.now() - start,
      });
    }
  }

  clear(): void {
    this.suiteResults = [];
    this.currentSuiteTitle = '';
    this.currentSuiteTests = [];
  }
}

export const testContext = new TestContext();

export function describe(title: string, fn: () => void): void {
  testContext.describe(title, fn);
}

export function it(name: string, fn: () => void | Promise<void>): void {
  // Synchronous registration or direct execution
  const start = Date.now();
  try {
    const res = fn();
    if (res && typeof (res as any).then === 'function') {
      // Async test
      (res as Promise<void>)
        .then(() => {
          (testContext as any).currentSuiteTests.push({
            name,
            passed: true,
            durationMs: Date.now() - start,
          });
        })
        .catch((err: any) => {
          (testContext as any).currentSuiteTests.push({
            name,
            passed: false,
            error: err.message || String(err),
            durationMs: Date.now() - start,
          });
        });
    } else {
      (testContext as any).currentSuiteTests.push({
        name,
        passed: true,
        durationMs: Date.now() - start,
      });
    }
  } catch (err: any) {
    (testContext as any).currentSuiteTests.push({
      name,
      passed: false,
      error: err.message || String(err),
      durationMs: Date.now() - start,
    });
  }
}

// ============================================================================
// ASSERTION PROXY & MATCHERS
// ============================================================================

export class AssertionProxy<T> {
  private readonly actual: T;
  private readonly isNot: boolean;

  constructor(actual: T, isNot: boolean = false) {
    this.actual = actual;
    this.isNot = isNot;
  }

  /**
   * Negation modifier chaining: returns an AssertionProxy instance in inverted mode.
   */
  get not(): AssertionProxy<T> {
    return new AssertionProxy<T>(this.actual, !this.isNot);
  }

  /**
   * Strict reference / primitive equality assertion (===).
   */
  toBe(expected: any): void {
    const pass = this.actual === expected;
    if (this.isNot ? pass : !pass) {
      throw new Error(
        this.isNot
          ? `Expected value NOT to be ${JSON.stringify(expected)}`
          : `Expected ${JSON.stringify(expected)}, but received ${JSON.stringify(this.actual)}`
      );
    }
  }

  /**
   * Deep JSON structural equality assertion.
   */
  toEqual(expected: any): void {
    const actualJson = JSON.stringify(this.actual);
    const expectedJson = JSON.stringify(expected);
    const pass = actualJson === expectedJson;
    if (this.isNot ? pass : !pass) {
      throw new Error(
        this.isNot
          ? `Expected value NOT to equal ${expectedJson}`
          : `Equality assertion failed:\nExpected: ${expectedJson}\nReceived: ${actualJson}`
      );
    }
  }

  /**
   * Undefined assertion.
   */
  toBeUndefined(): void {
    const pass = this.actual === undefined;
    if (this.isNot ? pass : !pass) {
      throw new Error(
        this.isNot
          ? `Expected defined value, but received undefined`
          : `Expected undefined, but received ${JSON.stringify(this.actual)}`
      );
    }
  }

  /**
   * Defined assertion (helper counterpart).
   */
  toBeDefined(): void {
    const pass = this.actual !== undefined;
    if (this.isNot ? pass : !pass) {
      throw new Error(
        this.isNot
          ? `Expected undefined, but received ${JSON.stringify(this.actual)}`
          : `Expected defined value, but received undefined`
      );
    }
  }

  /**
   * Null assertion.
   */
  toBeNull(): void {
    const pass = this.actual === null;
    if (this.isNot ? pass : !pass) {
      throw new Error(
        this.isNot
          ? `Expected value NOT to be null, but received null`
          : `Expected null, but received ${JSON.stringify(this.actual)}`
      );
    }
  }

  /**
   * Truthiness assertion.
   */
  toBeTruthy(): void {
    const pass = Boolean(this.actual);
    if (this.isNot ? pass : !pass) {
      throw new Error(
        this.isNot
          ? `Expected falsy value, but received truthy ${JSON.stringify(this.actual)}`
          : `Expected truthy value, but received ${JSON.stringify(this.actual)}`
      );
    }
  }

  /**
   * Falsiness assertion.
   */
  toBeFalsy(): void {
    const pass = !this.actual;
    if (this.isNot ? pass : !pass) {
      throw new Error(
        this.isNot
          ? `Expected truthy value, but received falsy ${JSON.stringify(this.actual)}`
          : `Expected falsy value, but received ${JSON.stringify(this.actual)}`
      );
    }
  }

  /**
   * Numeric greater-than assertion (>).
   */
  toBeGreaterThan(expected: number): void {
    if (typeof this.actual !== 'number') {
      throw new Error(`toBeGreaterThan called on non-number: ${typeof this.actual}`);
    }
    const pass = (this.actual as number) > expected;
    if (this.isNot ? pass : !pass) {
      throw new Error(
        this.isNot
          ? `Expected ${this.actual} NOT to be greater than ${expected}`
          : `Expected ${this.actual} to be greater than ${expected}`
      );
    }
  }

  /**
   * Numeric greater-than-or-equal assertion (>=).
   */
  toBeGreaterThanOrEqual(expected: number): void {
    if (typeof this.actual !== 'number') {
      throw new Error(`toBeGreaterThanOrEqual called on non-number: ${typeof this.actual}`);
    }
    const pass = (this.actual as number) >= expected;
    if (this.isNot ? pass : !pass) {
      throw new Error(
        this.isNot
          ? `Expected ${this.actual} NOT to be greater than or equal to ${expected}`
          : `Expected ${this.actual} to be greater than or equal to ${expected}`
      );
    }
  }

  /**
   * Numeric less-than assertion (<).
   */
  toBeLessThan(expected: number): void {
    if (typeof this.actual !== 'number') {
      throw new Error(`toBeLessThan called on non-number: ${typeof this.actual}`);
    }
    const pass = (this.actual as number) < expected;
    if (this.isNot ? pass : !pass) {
      throw new Error(
        this.isNot
          ? `Expected ${this.actual} NOT to be less than ${expected}`
          : `Expected ${this.actual} to be less than ${expected}`
      );
    }
  }

  /**
   * Numeric less-than-or-equal assertion (<=).
   */
  toBeLessThanOrEqual(expected: number): void {
    if (typeof this.actual !== 'number') {
      throw new Error(`toBeLessThanOrEqual called on non-number: ${typeof this.actual}`);
    }
    const pass = (this.actual as number) <= expected;
    if (this.isNot ? pass : !pass) {
      throw new Error(
        this.isNot
          ? `Expected ${this.actual} NOT to be less than or equal to ${expected}`
          : `Expected ${this.actual} to be less than or equal to ${expected}`
      );
    }
  }

  /**
   * Numeric floating point precision proximity assertion.
   */
  toBeCloseTo(expected: number, precision: number = 2): void {
    if (typeof this.actual !== 'number') {
      throw new Error(`toBeCloseTo called on non-number: ${typeof this.actual}`);
    }
    const pass = Math.abs((this.actual as number) - expected) <= Math.pow(10, -precision);
    if (this.isNot ? pass : !pass) {
      throw new Error(
        this.isNot
          ? `Expected ${this.actual} NOT to be close to ${expected} (precision ${precision})`
          : `Expected ${this.actual} to be close to ${expected} (precision ${precision})`
      );
    }
  }

  /**
   * Array or string item containment assertion.
   */
  toContain(item: any): void {
    let pass = false;
    const isArr = Array.isArray(this.actual);
    const isStr = typeof this.actual === 'string';

    if (isArr) {
      pass = (this.actual as unknown as any[]).includes(item);
    } else if (isStr) {
      pass = (this.actual as unknown as string).includes(item);
    } else {
      throw new Error(`toContain called on non-collection type`);
    }

    if (this.isNot ? pass : !pass) {
      throw new Error(
        this.isNot
          ? `Expected ${isArr ? 'array' : 'string'} NOT to contain ${JSON.stringify(item)}`
          : `Expected ${isArr ? 'array' : 'string'}${isStr ? ` "${this.actual}"` : ''} to contain ${JSON.stringify(item)}`
      );
    }
  }

  /**
   * Regular expression pattern matching assertion.
   */
  toMatch(regex: RegExp): void {
    if (typeof this.actual !== 'string') {
      throw new Error(`toMatch called on non-string: ${typeof this.actual}`);
    }
    const pass = regex.test(this.actual as unknown as string);
    if (this.isNot ? pass : !pass) {
      throw new Error(
        this.isNot
          ? `Expected "${this.actual}" NOT to match pattern ${regex}`
          : `Expected "${this.actual}" to match pattern ${regex}`
      );
    }
  }

  /**
   * Synchronous function exception throwing assertion.
   */
  toThrow(): void {
    if (typeof this.actual !== 'function') {
      throw new Error(`toThrow requires a function input`);
    }
    let threw = false;
    let thrownError: any = null;
    try {
      (this.actual as any)();
    } catch (err: any) {
      threw = true;
      thrownError = err;
    }
    if (this.isNot ? threw : !threw) {
      throw new Error(
        this.isNot
          ? `Expected function NOT to throw an error, but it threw: ${thrownError?.message || thrownError}`
          : `Expected function to throw an error, but it succeeded`
      );
    }
  }
}

export function expect<T>(actual: T): AssertionProxy<T> {
  return new AssertionProxy<T>(actual);
}

export function printSuiteReport(results: TestSuiteResult[]): { totalTests: number; totalPassed: number; totalFailed: number } {
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;

  for (const suite of results) {
    console.log(`\n📦 ${suite.title} (${suite.passedCount}/${suite.tests.length} passed, ${suite.durationMs}ms)`);
    for (const test of suite.tests) {
      totalTests++;
      if (test.passed) {
        totalPassed++;
        console.log(`  ✓ ${test.name} (${test.durationMs}ms)`);
      } else {
        totalFailed++;
        console.log(`  ✗ ${test.name} (${test.durationMs}ms)`);
        console.log(`    ↳ Error: ${test.error}`);
      }
    }
  }

  return { totalTests, totalPassed, totalFailed };
}
