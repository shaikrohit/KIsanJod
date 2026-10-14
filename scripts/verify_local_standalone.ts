import https from "https";
import http from "http";

function request(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: any } = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string; json?: any }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const postData = options.body ? JSON.stringify(options.body) : null;
    const isHttps = parsed.protocol === "https:";
    const client = isHttps ? https : http;

    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || "GET",
      headers: {
        "User-Agent": "KisanJod-Local-Verifier",
        ...(postData
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(postData),
            }
          : {}),
        ...options.headers,
      },
    };

    const req = client.request(reqOptions, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        let json;
        try {
          json = JSON.parse(body);
        } catch {}
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
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

async function verifyLocalStandalone() {
  console.log("==================================================================");
  console.log("     KISANJOD ZERO-DEPENDENCY STANDALONE INTEGRITY VERIFICATION   ");
  console.log("               Target: http://localhost:3005                      ");
  console.log("==================================================================\n");

  const LOCAL = "http://localhost:3005";
  let passed = 0;
  let failed = 0;

  function assert(name: string, ok: boolean, details?: string) {
    if (ok) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${details ? `(${details})` : ""}`);
      failed++;
    }
  }

  // --- SECTION 1: HTML PAGES ---
  console.log("▶ [1/6] Auditing HTML Pages...");
  const pages = [
    { path: "/", name: "Root Landing Page" },
    { path: "/login", name: "Trilingual Login Page" },
    { path: "/farmer/dashboard", name: "Farmer Multi-Slot Dashboard" },
    { path: "/farmer/book", name: "Continuous Slot Booking Wizard" },
    { path: "/farmer/queue", name: "Live Queue & Token Status" },
    { path: "/farmer/payments", name: "Farmer Digital J-Forms & Payments" },
    { path: "/operator", name: "Mandi Operator Weighbridge Console" },
    { path: "/admin", name: "DoCA National Analytics Command" },
  ];

  for (const p of pages) {
    const res = await request(`${LOCAL}${p.path}`);
    assert(`${p.name} (${p.path}) returns HTTP 200`, res.status === 200, `Got HTTP ${res.status}`);

    if (p.path === "/farmer/book") {
      const hasEstimatedPayout = res.body.includes("Estimated MSP Payout");
      const hasOfficialMspPrice = res.body.includes("Official MSP: ₹");
      const hasStep1Pill = res.body.includes("Step 1 • APMC Regulated");
      const hasCommodityCount = res.body.includes("7 Mandi Commodities Available");
      const hasApproxPill = res.body.includes("Approximate Window (Live Dynamic)");
      assert("/farmer/book does not contain 'Estimated MSP Payout'", !hasEstimatedPayout);
      assert("/farmer/book does not contain 'Official MSP: ₹'", !hasOfficialMspPrice);
      assert("/farmer/book does not contain 'Step 1 • APMC Regulated'", !hasStep1Pill);
      assert("/farmer/book does not contain '7 Mandi Commodities Available'", !hasCommodityCount);
      assert("/farmer/book does not contain 'Approximate Window (Live Dynamic)'", !hasApproxPill);
    }

    if (p.path === "/farmer/queue") {
      const hasLiveSyncing = res.body.includes("Live Syncing");
      assert("/farmer/queue does not contain 'Live Syncing'", !hasLiveSyncing);
    }

    const hasTestAlert = res.body.includes("Send Test Mobile Alert");
    assert(`${p.name} does not contain 'Send Test Mobile Alert'`, !hasTestAlert);
  }

  // --- SECTION 2: STATIC ASSETS & PWA ---
  console.log("\n▶ [2/6] Auditing Static Assets & Service Worker...");
  const assets = [
    "/manifest.json",
    "/sw.js",
    "/icons/icon.svg",
    "/icons/farmer-avatar.svg",
    "/crops/wheat.jpg",
    "/crops/paddy.jpg",
    "/crops/tomato.jpg",
    "/crops/onion.jpg",
  ];

  for (const a of assets) {
    const res = await request(`${LOCAL}${a}`);
    assert(`Asset ${a} returns HTTP 200`, res.status === 200, `Got HTTP ${res.status}`);
  }

  // --- SECTION 3: AUTHENTICATION FLOWS ---
  console.log("\n▶ [3/6] Testing Authentication Flows...");
  {
    const resInvalid = await request(`${LOCAL}/api/auth/login`, {
      method: "POST",
      body: { aadhaarNumber: "123" },
    });
    assert("Rejects invalid Aadhaar with HTTP 400", resInvalid.status === 400);

    const resOtp = await request(`${LOCAL}/api/auth/login`, {
      method: "POST",
      body: { aadhaarNumber: "123456789012" },
    });
    assert("Sends OTP for farmer Gurpreet Singh (HTTP 200)", resOtp.status === 200 && resOtp.json?.success === true);

    const farmerId = resOtp.json?.farmerId || "farmer_001";

    const resVerify = await request(`${LOCAL}/api/auth/verify-otp`, {
      method: "POST",
      body: { farmerId, otp: "123456" },
    });
    assert("Verifies demo OTP and returns masked profile", resVerify.status === 200 && resVerify.json?.farmer?.maskedAadhaar === "XXXXXXXX5678");

    const resOp = await request(`${LOCAL}/api/operator/login`, {
      method: "POST",
      body: { employeeId: "EMP-LUD-001", pin: "1234" },
    });
    assert("Mandi operator login succeeds with HTTP 200", resOp.status === 200 && Boolean(resOp.json?.operator));
  }

  // --- SECTION 4: PROCUREMENT CENTRES & 15 STATES ---
  console.log("\n▶ [4/6] Testing APMC Mandis & State Filtering...");
  {
    const resAll = await request(`${LOCAL}/api/centres`);
    assert("Centres API returns HTTP 200", resAll.status === 200);
    const count = resAll.json?.centres?.length || 0;
    assert("Returns all 113 APMC mandis across India", count === 113, `Count: ${count}`);

    const statesToCheck = ["Andhra Pradesh", "Punjab", "Maharashtra", "Uttar Pradesh", "Telangana"];
    for (const st of statesToCheck) {
      const resSt = await request(`${LOCAL}/api/centres?state=${encodeURIComponent(st)}`);
      const stCount = resSt.json?.centres?.length || 0;
      assert(`State filter '${st}' returns mandis (${stCount} found)`, resSt.status === 200 && stCount >= 4);
    }
  }

  // --- SECTION 5: SLOTS ENGINE & QUOTA RULES ---
  console.log("\n▶ [5/6] Testing Slot Engine & 3-Booking Limit Boundary...");
  {
    const todayStr = new Date().toISOString().split("T")[0];
    const resSlots = await request(`${LOCAL}/api/centres/center_lud_01/slots?date=${todayStr}&packageCount=40&unitType=GUNNY_BAG_50KG`);
    assert("Continuous slot engine returns HTTP 200", resSlots.status === 200);
    assert("Returns operating sessions & handling metrics", Boolean(resSlots.json?.sessions && resSlots.json?.handling));

    // Test Quota Check with excessive booking
    const resExcess = await request(`${LOCAL}/api/bookings`, {
      method: "POST",
      body: {
        farmerId: "farmer_001",
        centerId: "center_lud_01",
        cropName: "Wheat",
        commodityCategory: "GRAINS",
        unitType: "GUNNY_BAG_50KG",
        packageCount: 1000, // 500 Qtl exceeds 100 Qtl quota
        date: "2026-11-15",
        hourOfDay: 10,
        sessionName: "MORNING",
      },
    });
    assert("Rejects excessive quantity with HTTP 400 & QUOTA_EXCEEDED", resExcess.status === 400 && resExcess.json?.errorType === "QUOTA_EXCEEDED");
    assert("Remaining quota is non-negative and structured", resExcess.json?.quotaDetails?.remainingQuotaQtl >= 0);

    // Test Valid Booking Creation
    const resValid = await request(`${LOCAL}/api/bookings`, {
      method: "POST",
      body: {
        farmerId: "farmer_001",
        centerId: "center_lud_01",
        cropName: "Wheat",
        commodityCategory: "GRAINS",
        unitType: "GUNNY_BAG_50KG",
        packageCount: 20, // 10 Qtl
        date: "2026-11-20",
        hourOfDay: 9,
        sessionName: "MORNING",
      },
    });
    assert("Valid slot booking succeeds with HTTP 200", resValid.status === 200 && resValid.json?.success === true);
    assert("Sequential token generated (e.g. M-001)", typeof resValid.json?.booking?.tokenNumber === "string");

    // Test Farmer Bookings GET
    const resBookings = await request(`${LOCAL}/api/bookings?farmerId=farmer_001`);
    assert("Farmer bookings GET returns HTTP 200", resBookings.status === 200 && Array.isArray(resBookings.json?.bookings));

    // Test Mandi Queue GET
    const resQueue = await request(`${LOCAL}/api/queue/center_lud_01?date=${todayStr}`);
    assert("Live Queue API returns HTTP 200", resQueue.status === 200 && Array.isArray(resQueue.json?.waitingQueue));
  }

  // --- SECTION 6: DOCA ADMIN OVERSIGHT & TELEMETRY ---
  console.log("\n▶ [6/6] Testing DoCA Analytics Telemetry...");
  {
    const resAdmin = await request(`${LOCAL}/api/admin/stats`);
    assert("Admin stats API returns HTTP 200", resAdmin.status === 200);
    assert("Provides national procurement metrics", typeof resAdmin.json?.overview?.totalProcuredQtl === "number");
    assert("Provides active mandis breakdown", Array.isArray(resAdmin.json?.centreStats));
  }

  console.log("\n==================================================================");
  console.log(` LOCAL STANDALONE AUDIT: ${passed} Passed, ${failed} Failed`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("🎉 100% OF END-TO-END FLOWS PASS LOCALLY WITH ZERO DEPENDENCIES!\n");
  }
}

verifyLocalStandalone().catch((err) => {
  console.error("Local standalone verification failed with fatal exception:", err);
  process.exit(1);
});
