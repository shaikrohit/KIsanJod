import http from "http";

function fetchJson(url: string, options: http.RequestOptions = {}, postData?: any): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || 3000,
      path: parsed.pathname + parsed.search,
      method: options.method || "GET",
      headers: {
        "User-Agent": "KisanJod-Feature-Verifier",
        ...(postData ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    };

    const req = http.request(reqOptions, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const data = JSON.parse(body);
          resolve({ status: res.statusCode || 0, data });
        } catch {
          resolve({ status: res.statusCode || 0, data: body });
        }
      });
    });

    req.on("error", reject);
    if (postData) req.write(JSON.stringify(postData));
    req.end();
  });
}

async function verifyAllFeaturesInDepth() {
  console.log("==================================================================");
  console.log("   IN-DEPTH VERIFICATION: KISANJOD PLATFORM RULES & DATA INTEGRITY ");
  console.log("==================================================================\n");

  const BASE = "http://localhost:3000";
  let passed = 0;
  const totalTests = 7;

  // 1. Check all 15 States and 100+ Procurement Centres
  console.log("▶ [1/7] Testing All 15 States & 100+ Authentic APMC Mandis...");
  const states = [
    "Andhra Pradesh", "Telangana", "Punjab", "Haryana", "Madhya Pradesh",
    "Uttar Pradesh", "Rajasthan", "Maharashtra", "Karnataka", "Tamil Nadu",
    "Gujarat", "Bihar", "West Bengal", "Odisha", "Chhattisgarh"
  ];

  let statesPassed = 0;
  let totalCentresFound = 0;

  for (const st of states) {
    const res = await fetchJson(`${BASE}/api/centres?state=${encodeURIComponent(st)}`);
    if (res.status === 200 && res.data.centres && res.data.centres.length >= 5) {
      const allMatch = res.data.centres.every((c: any) => c.state === st);
      if (allMatch) {
        statesPassed++;
        totalCentresFound += res.data.centres.length;
      }
    }
  }

  if (statesPassed === 15 && totalCentresFound >= 100) {
    console.log(`  ✓ All 15 agricultural states validated! Total mandis verified: ${totalCentresFound} (Expected >= 100).`);
    passed++;
  } else {
    console.error(`  ❌ State verification failed: ${statesPassed}/15 passed, ${totalCentresFound} centres.`);
  }

  // 2. Clear old pending bookings for farmer_002 to test Quota Calculation
  console.log("\n▶ [2/7] Testing Quota Math (No Negative Numbers & Clean Error Type)...");
  const existingFarmer2 = await fetchJson(`${BASE}/api/bookings?farmerId=farmer_002`);
  if (existingFarmer2.status === 200 && Array.isArray(existingFarmer2.data.bookings)) {
    for (const b of existingFarmer2.data.bookings) {
      if (["WAITING", "CALLED", "AT_BAY", "STANDBY"].includes(b.status)) {
        await fetchJson(`${BASE}/api/bookings`, { method: "PATCH" }, { bookingId: b.id, action: "cancel" });
      }
    }
  }

  const quotaTest = await fetchJson(`${BASE}/api/bookings`, { method: "POST" }, {
    farmerId: "farmer_002",
    centerId: "center_gnt_01",
    cropName: "Paddy",
    packageCount: 500, // 500 bags * 50kg = 250 Qtl exceeds 98 Qtl verified quota
    capacityKg: 50,
    date: "2026-10-15",
  });

  if (
    quotaTest.status === 400 &&
    quotaTest.data.errorType === "QUOTA_EXCEEDED" &&
    quotaTest.data.quotaDetails
  ) {
    const qd = quotaTest.data.quotaDetails;
    if (qd.remainingQuotaQtl >= 0 && qd.totalQuotaQtl > 0 && !quotaTest.data.error.includes("-")) {
      console.log(`  ✓ Quota error returned cleanly structured JSON with NO negative numbers:`);
      console.log(`     - Remaining Quota: ${qd.remainingQuotaQtl} Qtl`);
      console.log(`     - Total Quota: ${qd.totalQuotaQtl} Qtl`);
      console.log(`     - Active Booked: ${qd.activeBookedQtl} Qtl`);
      console.log(`     - Friendly Message: "${quotaTest.data.error}"`);
      passed++;
    } else {
      console.error("  ❌ Quota details contain negative values or message contains negative symbol:", qd, quotaTest.data.error);
    }
  } else {
    console.error("  ❌ Quota rejection failed:", quotaTest);
  }

  // 3. Test 3-Slot Maximum Booking Limit
  console.log("\n▶ [3/7] Testing Active Slot Limit (Max 3 Concurrent Bookings Rule)...");
  const testFarmerId = "farmer_003";

  // Clear any existing active bookings for farmer_003 first
  const existingFarmer3 = await fetchJson(`${BASE}/api/bookings?farmerId=${testFarmerId}`);
  if (existingFarmer3.status === 200 && Array.isArray(existingFarmer3.data.bookings)) {
    for (const b of existingFarmer3.data.bookings) {
      if (["WAITING", "CALLED", "AT_BAY", "STANDBY"].includes(b.status)) {
        await fetchJson(`${BASE}/api/bookings`, { method: "PATCH" }, { bookingId: b.id, action: "cancel" });
      }
    }
  }

  // Create 3 valid bookings on different dates
  const createdBookingIds: string[] = [];
  const testDates = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"];

  for (let i = 0; i < 3; i++) {
    const res = await fetchJson(`${BASE}/api/bookings`, { method: "POST" }, {
      farmerId: testFarmerId,
      centerId: "center_seh_01",
      cropName: "Wheat",
      packageCount: 5, // 2.5 Qtl (well within quota)
      capacityKg: 50,
      date: testDates[i],
    });
    if (res.status === 200 && res.data.booking?.id) {
      createdBookingIds.push(res.data.booking.id);
    } else {
      console.error(`  ❌ Failed to create baseline booking ${i + 1}:`, res);
    }
  }

  console.log(`  - Successfully created ${createdBookingIds.length}/3 baseline bookings for farmer.`);

  // Now attempt to book a 4th slot
  const fourthBooking = await fetchJson(`${BASE}/api/bookings`, { method: "POST" }, {
    farmerId: testFarmerId,
    centerId: "center_seh_01",
    cropName: "Wheat",
    packageCount: 5,
    capacityKg: 50,
    date: testDates[3],
  });

  if (
    fourthBooking.status === 400 &&
    fourthBooking.data.errorType === "ACTIVE_SLOT_LIMIT_EXCEEDED"
  ) {
    console.log(`  ✓ 4th slot correctly rejected with HTTP 400 & ACTIVE_SLOT_LIMIT_EXCEEDED:`);
    console.log(`     "${fourthBooking.data.error}"`);
    passed++;
  } else {
    console.error("  ❌ Slot limit constraint check failed:", fourthBooking);
  }

  // 4. Test Slot Cancellation & Slot Release
  console.log("\n▶ [4/7] Testing Cancellation & Re-booking Release...");
  if (createdBookingIds.length >= 3) {
    const bookingToCancel = createdBookingIds[0];
    const cancelRes = await fetchJson(`${BASE}/api/bookings`, { method: "PATCH" }, {
      bookingId: bookingToCancel,
      action: "cancel",
      reason: "Automated verification test release",
    });

    if (cancelRes.status === 200 && cancelRes.data.booking?.status === "CANCELLED") {
      console.log(`  ✓ Booking ${bookingToCancel} cancelled successfully. Status = CANCELLED.`);

      // With 1 slot freed (now only 2 active), 4th booking should now succeed!
      const retryBooking = await fetchJson(`${BASE}/api/bookings`, { method: "POST" }, {
        farmerId: testFarmerId,
        centerId: "center_seh_01",
        cropName: "Wheat",
        packageCount: 5,
        capacityKg: 50,
        date: testDates[3],
      });

      if (retryBooking.status === 200 && retryBooking.data.booking?.id) {
        console.log(`  ✓ Re-booking succeeded after cancellation! (Active slots count permitted: 3).`);
        createdBookingIds.push(retryBooking.data.booking.id);
        passed++;
      } else {
        console.error("  ❌ Re-booking after cancellation failed:", retryBooking);
      }
    } else {
      console.error("  ❌ Cancellation PATCH failed:", cancelRes);
    }
  }

  // 5. Verify Date Filter on Queue Telemetry
  console.log("\n▶ [5/7] Testing Staff Date-wise Telemetry on /api/queue/center_seh_01?date=2026-11-02...");
  const dateQueueRes = await fetchJson(`${BASE}/api/queue/center_seh_01?date=2026-11-02`);
  if (dateQueueRes.status === 200 && dateQueueRes.data.date === "2026-11-02") {
    console.log(`  ✓ Staff date-wise queue query returned successfully for date ${dateQueueRes.data.date}`);
    passed++;
  } else {
    console.error("  ❌ Date queue query failed:", dateQueueRes);
  }

  // 6. Verify Service Worker for Native Notifications
  console.log("\n▶ [6/7] Testing Service Worker Notification & Push Event Hooks...");
  const swRes = await new Promise<{ status: number; body: string }>((resolve) => {
    http.get(`${BASE}/sw.js`, (res) => {
      let b = "";
      res.on("data", (c) => (b += c));
      res.on("end", () => resolve({ status: res.statusCode || 0, body: b }));
    });
  });

  if (swRes.status === 200 && swRes.body.includes("notificationclick") && swRes.body.includes("push")) {
    console.log("  ✓ /sw.js successfully serves notificationclick and push event handlers (HTTP 200)");
    passed++;
  } else {
    console.error("  ❌ /sw.js missing notification handlers");
  }

  // 7. Clean up test bookings
  console.log("\n▶ [7/7] Cleaning up test bookings...");
  let cleanupOk = true;
  for (const bId of createdBookingIds) {
    try {
      await fetchJson(`${BASE}/api/bookings`, { method: "PATCH" }, {
        bookingId: bId,
        action: "cancel",
      });
    } catch {
      cleanupOk = false;
    }
  }
  if (cleanupOk) {
    console.log(`  ✓ All ${createdBookingIds.length} test bookings cleaned up gracefully.`);
    passed++;
  }

  console.log("\n==================================================================");
  console.log(`   IN-DEPTH VERIFICATION COMPLETE: ${passed}/${totalTests} CHECKS PASSED `);
  console.log("==================================================================");

  if (passed < totalTests) process.exit(1);
}

verifyAllFeaturesInDepth().catch((err) => {
  console.error("Verification failed with uncaught exception:", err);
  process.exit(1);
});
