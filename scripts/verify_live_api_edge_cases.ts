import http from "http";
import { db } from "../src/lib/db";
import { syncBus, SyncPayload } from "../src/lib/syncBus";

function request(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: any } = {}
): Promise<{ status: number; body: string; json?: any }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const postData = options.body ? JSON.stringify(options.body) : null;
    const reqOptions: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || 3000,
      path: parsed.pathname + parsed.search,
      method: options.method || "GET",
      headers: {
        "User-Agent": "KisanJod-Live-API-Test",
        ...(postData
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(postData),
            }
          : {}),
        ...options.headers,
      },
    };

    const req = http.request(reqOptions, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        let json;
        try {
          json = JSON.parse(body);
        } catch {}
        resolve({
          status: res.statusCode || 0,
          body,
          json,
        });
      });
    });

    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runLiveHttpEdgeCaseTests() {
  console.log("==================================================================");
  console.log("     KISANJOD LIVE HTTP API & CROSS-ROLE EDGE-CASE VERIFICATION    ");
  console.log("==================================================================\n");

  const BASE = "http://127.0.0.1:3000";
  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name} ${details ? `(${details})` : ""}`);
      failed++;
    }
  }

  try {
    const farmer = await db.farmer.findUnique({
      where: { id: "farmer_001" },
      include: { landRecords: true, bankAccounts: true },
    });
    if (!farmer) throw new Error("Farmer farmer_001 not found");

    const ludhiana = await db.procurementCenter.findFirst({
      where: { OR: [{ id: "center_lud_01" }, { centerCode: "MND-LUD-01" }] },
    });
    if (!ludhiana) throw new Error("Ludhiana center not found");

    const guntur = await db.procurementCenter.findFirst({
      where: { state: "Andhra Pradesh" },
    });
    if (!guntur) throw new Error("Guntur center not found");

    const operator = await db.operator.findFirst({
      where: { employeeId: "EMP-LUD-001" },
    });
    if (!operator) throw new Error("Operator EMP-LUD-001 not found");

    // Clean up any pre-existing test bookings for clean state (preserve seed completed booking)
    await db.booking.deleteMany({
      where: {
        farmerId: farmer.id,
        id: { not: "booking_seed_001" },
      },
    });

    // Reset farmer_001 Wheat utilized quota to 0.0 for clean test isolation
    await db.landRecord.updateMany({
      where: { farmerId: farmer.id, verifiedSownCrop: "Wheat" },
      data: { utilizedQuotaQtl: 0.0 },
    });

    console.log("[Scenario 1] Testing Real HTTP 3-Active-Booking Limit Boundary...");
    const createdBookingIds: string[] = [];

    // Book Slot 1
    const res1 = await request(`${BASE}/api/bookings`, {
      method: "POST",
      body: {
        farmerId: farmer.id,
        centerId: ludhiana.id,
        cropName: "Wheat",
        packageCount: 10, // 5 Qtl
        capacityKg: 50,
        date: "2026-11-10",
        startTime: "09:00",
        endTime: "09:30",
        sessionName: "MORNING",
        unitType: "GUNNY_BAG_50KG",
      },
    });
    assert("HTTP Slot 1 booked successfully (200 OK)", res1.status === 200 && res1.json?.success);
    if (res1.json?.booking?.id) createdBookingIds.push(res1.json.booking.id);

    // Book Slot 2
    const res2 = await request(`${BASE}/api/bookings`, {
      method: "POST",
      body: {
        farmerId: farmer.id,
        centerId: ludhiana.id,
        cropName: "Wheat",
        packageCount: 10, // 5 Qtl
        capacityKg: 50,
        date: "2026-11-11",
        startTime: "09:00",
        endTime: "09:30",
        sessionName: "MORNING",
        unitType: "GUNNY_BAG_50KG",
      },
    });
    assert("HTTP Slot 2 booked successfully (200 OK)", res2.status === 200 && res2.json?.success);
    if (res2.json?.booking?.id) createdBookingIds.push(res2.json.booking.id);

    // Book Slot 3
    const res3 = await request(`${BASE}/api/bookings`, {
      method: "POST",
      body: {
        farmerId: farmer.id,
        centerId: ludhiana.id,
        cropName: "Wheat",
        packageCount: 10, // 5 Qtl
        capacityKg: 50,
        date: "2026-11-12",
        startTime: "09:00",
        endTime: "09:30",
        sessionName: "MORNING",
        unitType: "GUNNY_BAG_50KG",
      },
    });
    assert("HTTP Slot 3 booked successfully (200 OK - Cap reached)", res3.status === 200 && res3.json?.success);
    if (res3.json?.booking?.id) createdBookingIds.push(res3.json.booking.id);

    // Attempt Slot 4 (Must be blocked with ACTIVE_SLOT_LIMIT_EXCEEDED)
    const res4 = await request(`${BASE}/api/bookings`, {
      method: "POST",
      body: {
        farmerId: farmer.id,
        centerId: ludhiana.id,
        cropName: "Wheat",
        packageCount: 10,
        capacityKg: 50,
        date: "2026-11-13",
        startTime: "09:00",
        endTime: "09:30",
        sessionName: "MORNING",
        unitType: "GUNNY_BAG_50KG",
      },
    });
    assert("HTTP 4th booking strictly blocked with 400 Bad Request", res4.status === 400);
    assert("Returns errorType ACTIVE_SLOT_LIMIT_EXCEEDED", res4.json?.errorType === "ACTIVE_SLOT_LIMIT_EXCEEDED");

    console.log("\n[Scenario 2] Testing Reschedule at Max Slot Boundary (3 Active Slots)...");
    const oldSlotId = createdBookingIds[1];
    const resReschedule = await request(`${BASE}/api/bookings`, {
      method: "POST",
      body: {
        farmerId: farmer.id,
        centerId: ludhiana.id,
        cropName: "Wheat",
        packageCount: 10,
        capacityKg: 50,
        date: "2026-11-14",
        startTime: "15:00",
        endTime: "15:30",
        sessionName: "AFTERNOON",
        unitType: "GUNNY_BAG_50KG",
        rescheduleBookingId: oldSlotId,
      },
    });
    assert("Reschedule allowed at 3 slots when replacing existing slot (200 OK)", resReschedule.status === 200 && resReschedule.json?.success);
    if (resReschedule.json?.booking?.id) createdBookingIds.push(resReschedule.json.booking.id);

    // Confirm old slot is marked CANCELLED
    const oldSlotCheck = await db.booking.findUnique({ where: { id: oldSlotId } });
    assert("Original rescheduled slot auto-cancelled in database", oldSlotCheck?.status === "CANCELLED");

    // Free slot 3 so active bookings count is 2, allowing subsequent edge-case tests (same-day conflict & quota) to proceed
    const slot3Id = createdBookingIds[2];
    await request(`${BASE}/api/bookings`, {
      method: "PATCH",
      body: { bookingId: slot3Id, action: "cancel" },
    });

    console.log("\n[Scenario 3] Testing Same-Day Multi-Mandi Scheduling Conflict...");
    // Try booking at Guntur on 2026-11-10 where farmer already holds slot at Ludhiana
    const resSameDay = await request(`${BASE}/api/bookings`, {
      method: "POST",
      body: {
        farmerId: farmer.id,
        centerId: guntur.id,
        cropName: "Wheat",
        packageCount: 10,
        capacityKg: 50,
        date: "2026-11-10",
        startTime: "10:00",
        endTime: "10:30",
        sessionName: "MORNING",
        unitType: "GUNNY_BAG_50KG",
      },
    });
    assert("Same-day different mandi booking blocked with HTTP 400", resSameDay.status === 400);
    assert("Returns errorType SAME_DAY_CONFLICT", resSameDay.json?.errorType === "SAME_DAY_CONFLICT");

    console.log("\n[Scenario 4] Testing Seasonal Land Quota Enforcement & Clamping...");
    // Try to book 200 Qtl (400 bags) Wheat when remaining quota is much lower
    const resQuota = await request(`${BASE}/api/bookings`, {
      method: "POST",
      body: {
        farmerId: farmer.id,
        centerId: ludhiana.id,
        cropName: "Wheat",
        packageCount: 400, // 200 Qtl
        capacityKg: 50,
        date: "2026-11-20",
        startTime: "09:00",
        endTime: "09:30",
        sessionName: "MORNING",
        unitType: "GUNNY_BAG_50KG",
      },
    });
    assert("Excessive quota booking blocked with HTTP 400", resQuota.status === 400);
    assert("Returns errorType QUOTA_EXCEEDED with structured quotaDetails", resQuota.json?.errorType === "QUOTA_EXCEEDED" && !!resQuota.json?.quotaDetails);
    assert("Remaining quota clamped at >= 0 (no negative values)", resQuota.json?.quotaDetails?.remainingQuotaQtl >= 0);

    console.log("\n[Scenario 5] Testing Cancellation & Slot Capacity Release...");
    const cancelTargetId = createdBookingIds[0];
    const resCancel = await request(`${BASE}/api/bookings`, {
      method: "PATCH",
      body: {
        bookingId: cancelTargetId,
        action: "cancel",
        reason: "Farmer transport delay",
      },
    });
    assert("Booking cancelled via PATCH (200 OK)", resCancel.status === 200 && resCancel.json?.success);
    const cancelCheck = await db.booking.findUnique({ where: { id: cancelTargetId } });
    assert("Booking status is CANCELLED in database", cancelCheck?.status === "CANCELLED");

    console.log("\n[Scenario 6] Testing Operator Standby -> Recall -> Weighment & Quota Deduct...");
    // Create a fresh waiting booking to test operator workflow
    const resTestToken = await request(`${BASE}/api/bookings`, {
      method: "POST",
      body: {
        farmerId: farmer.id,
        centerId: ludhiana.id,
        cropName: "Wheat",
        packageCount: 20, // 10 Qtl
        capacityKg: 50,
        date: new Date().toISOString().split("T")[0],
        startTime: "11:00",
        endTime: "11:30",
        sessionName: "MORNING",
        unitType: "GUNNY_BAG_50KG",
      },
    });
    assert("Waiting token created for operator flow", resTestToken.status === 200);
    const testBookingId = resTestToken.json?.booking?.id;
    if (testBookingId) createdBookingIds.push(testBookingId);

    // Operator marks token standby
    const resStandby = await request(`${BASE}/api/operator`, {
      method: "POST",
      body: {
        action: "standby",
        bookingId: testBookingId,
      },
    });
    assert("Operator puts token on standby (200 OK)", resStandby.status === 200 && resStandby.json?.status === "STANDBY");

    // Operator recalls from standby to bay
    const resRecall = await request(`${BASE}/api/operator`, {
      method: "POST",
      body: {
        action: "resume_standby",
        bookingId: testBookingId,
      },
    });
    assert("Operator recalls standby token to bay (200 OK)", resRecall.status === 200 && resRecall.json?.status === "CALLED");

    // Check land record utilizedQuota before weighment
    const landBefore = await db.landRecord.findFirst({
      where: { farmerId: farmer.id, verifiedSownCrop: "Wheat" },
    });
    const utilizedBefore = landBefore?.utilizedQuotaQtl || 0;

    // Operator submits weighment
    const resWeigh = await request(`${BASE}/api/operator`, {
      method: "POST",
      body: {
        action: "process",
        bookingId: testBookingId,
        centerId: ludhiana.id,
        operatorId: operator.id,
        gradeData: {
          qualityGrade: "GRADE_A",
          moisturePct: 10.5,
          grossWeightQtl: 22.0,
          tareWeightQtl: 12.0, // net = 10.0 Qtl
        },
      },
    });
    assert("Weighment submitted and J-Form generated (200 OK)", resWeigh.status === 200 && !!resWeigh.json?.bill?.billNumber);
    assert("Net weight accurately recorded as 10.0 Qtl", resWeigh.json?.bill?.netWeightQtl === 10);

    // Verify land record utilized quota was updated by operator weighment
    const landAfter = await db.landRecord.findFirst({
      where: { farmerId: farmer.id, verifiedSownCrop: "Wheat" },
    });
    assert("LandRecord.utilizedQuotaQtl incremented by net weight", (landAfter?.utilizedQuotaQtl || 0) === utilizedBefore + 10);

    console.log("\n[Scenario 7] Testing Multi-Crop Quota Independence...");
    // Farmer books Paddy (secondary land holding: 84 Qtl)
    const resPaddy = await request(`${BASE}/api/bookings`, {
      method: "POST",
      body: {
        farmerId: farmer.id,
        centerId: ludhiana.id,
        cropName: "Paddy",
        packageCount: 40, // 20 Qtl
        capacityKg: 50,
        date: "2026-11-25",
        startTime: "09:00",
        endTime: "09:30",
        sessionName: "MORNING",
        unitType: "GUNNY_BAG_50KG",
      },
    });
    assert("Paddy booked against Paddy land quota successfully (200 OK)", resPaddy.status === 200 && resPaddy.json?.success);
    if (resPaddy.json?.booking?.id) createdBookingIds.push(resPaddy.json.booking.id);

    // Clean up created test bookings
    if (createdBookingIds.length > 0) {
      await db.booking.deleteMany({
        where: { id: { in: createdBookingIds } },
      });
      // Reset utilized quota for farmer Wheat to clean 0.0 state
      await db.landRecord.updateMany({
        where: { farmerId: farmer.id, verifiedSownCrop: "Wheat" },
        data: { utilizedQuotaQtl: 0.0 },
      });
    }

    console.log("\n==================================================================");
    console.log(` LIVE API AUDIT RESULT: ${passed} Passed, ${failed} Failed`);
    console.log("==================================================================");

    if (failed > 0) {
      console.error("❌ Live API edge case test failed.");
      process.exit(1);
    } else {
      console.log("✅ ALL LIVE HTTP API & CROSS-ROLE EDGE CASES VERIFIED (0 ERRORS).\n");
      process.exit(0);
    }
  } catch (e) {
    console.error("Test execution error:", e);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

runLiveHttpEdgeCaseTests();
