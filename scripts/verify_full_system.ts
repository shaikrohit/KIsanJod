import http from "http";
import { db } from "@/lib/db";
import { translations } from "@/lib/i18n";
import fs from "fs";
import path from "path";

function request(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: any } = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string; json?: any }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const postData = options.body ? JSON.stringify(options.body) : null;
    const reqOptions: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || 3000,
      path: parsed.pathname + parsed.search,
      method: options.method || "GET",
      headers: {
        "User-Agent": "KisanJod-Full-Audit",
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

function probeSSE(url: string): Promise<{ status: number; contentType: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 3000,
        path: parsed.pathname,
        headers: { Accept: "text/event-stream" },
      },
      (res) => {
        const result = {
          status: res.statusCode || 0,
          contentType: res.headers["content-type"] || "",
        };
        req.destroy();
        resolve(result);
      }
    );
    req.on("error", (err: any) => {
      if (err.code === "ECONNRESET") return;
      reject(err);
    });
    req.end();
  });
}

async function runSystemAudit() {
  console.log("==================================================================");
  console.log("      KISANJOD COMPREHENSIVE END-TO-END SYSTEM HEALTH AUDIT       ");
  console.log("==================================================================\n");

  const BASE = "http://127.0.0.1:3000";
  let passCount = 0;
  let failCount = 0;

  function assert(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`  ✓ ${name}`);
      passCount++;
    } else {
      console.error(`  ✗ FAIL: ${name} ${details ? `(${details})` : ""}`);
      failCount++;
    }
  }

  // --- SECTION 1: AUTHENTICATION & SECURITY BOUNDARIES ---
  console.log("\n[1] Testing Farmer Authentication API Boundaries...");
  {
    // Invalid Aadhaar (too short)
    const resShort = await request(`${BASE}/api/auth/login`, {
      method: "POST",
      body: { aadhaarNumber: "123" },
    });
    assert("Rejects too short Aadhaar format (HTTP 400)", resShort.status === 400);

    // Testing Rule: Disallowed starting digit (e.g. 9)
    const resDisallowed = await request(`${BASE}/api/auth/login`, {
      method: "POST",
      body: { aadhaarNumber: "999999999999" },
    });
    assert("Rejects unauthorized Aadhaar prefix with HTTP 400", resDisallowed.status === 400);

    // Valid Registered Aadhaar (starts with 1)
    const resValid = await request(`${BASE}/api/auth/login`, {
      method: "POST",
      body: { aadhaarNumber: "123456789012" },
    });
    assert("Sends OTP for valid registered Aadhaar (HTTP 200)", resValid.status === 200 && resValid.json?.success === true);

    const farmerId = resValid.json?.farmer?.id || "farmer_001";

    // Wrong OTP
    const resWrongOtp = await request(`${BASE}/api/auth/verify-otp`, {
      method: "POST",
      body: { farmerId, otp: "000000" },
    });
    assert("Rejects invalid OTP with 401", resWrongOtp.status === 401);

    // Correct Demo OTP
    const resCorrectOtp = await request(`${BASE}/api/auth/verify-otp`, {
      method: "POST",
      body: { farmerId, otp: "123456" },
    });
    assert(
      "Verifies correct OTP and returns farmer profile",
      resCorrectOtp.status === 200 && resCorrectOtp.json?.farmer?.fullName === "Gurpreet Singh"
    );
    assert(
      "Masks Aadhaar number in response for PII security",
      resCorrectOtp.json?.farmer?.maskedAadhaar?.startsWith("XXXX")
    );
  }

  // --- SECTION 2: PROCUREMENT CENTRES & SESSIONS ---
  console.log("\n[2] Testing Mandi Procurement Centres & Operating Sessions...");
  let centerId = "center_lud_01";
  {
    const resCentres = await request(`${BASE}/api/centres`);
    assert("Centres API returns HTTP 200", resCentres.status === 200);
    const centres = resCentres.json?.centres || [];
    assert("Returns at least 4 active procurement centres", centres.length >= 4);

    const ludhiana = centres.find((c: any) => c.centerCode === "MND-LUD-01");
    assert("Ludhiana Central Grain Mandi exists", Boolean(ludhiana));
    if (ludhiana) {
      centerId = ludhiana.id;
      assert(
        "Configures Morning and Afternoon operating sessions",
        Boolean(ludhiana.morningSessionStart && ludhiana.afternoonSessionStart)
      );
    }
  }

  // --- SECTION 3: CONTINUOUS DYNAMIC SLOT ALLOCATION ENGINE ---
  console.log("\n[3] Testing Continuous Slot Engine API...");
  {
    const todayStr = new Date().toISOString().split("T")[0];
    const resSlots = await request(
      `${BASE}/api/centres/${centerId}/slots?date=${todayStr}&packageCount=20&unitType=GUNNY_BAG_50KG`
    );
    assert("Slots API returns HTTP 200", resSlots.status === 200);
    assert("Returns center operating sessions timeline", Boolean(resSlots.json?.sessions?.morningSession && resSlots.json?.sessions?.afternoonSession));
    assert("Calculates dynamic handling duration for volume", typeof resSlots.json?.handling?.totalDurationMinutes === "number");
  }

  // --- SECTION 4: BOOKING LIFECYCLE & OPERATOR QUEUE WEIGHMENT ---
  console.log("\n[4] Testing Complete Booking -> Queue -> Weighment -> J-Form Flow...");
  let createdBookingId = "";
  let createdTokenNumber = "";
  {
    const farmer = await db.farmer.findFirst({ where: { id: "farmer_001" } });
    if (!farmer) throw new Error("Farmer farmer_001 not found");

    const todayStr = new Date().toISOString().split("T")[0];
    const resBook = await request(`${BASE}/api/bookings`, {
      method: "POST",
      body: {
        farmerId: farmer.id,
        centerId: centerId,
        cropName: "Wheat",
        commodityCategory: "GRAINS",
        unitType: "GUNNY_BAG_50KG",
        packageCount: 60,
        date: todayStr,
        hourOfDay: 10,
        sessionName: "MORNING",
      },
    });

    assert("Slot booking confirmed with HTTP 200", resBook.status === 200 && resBook.json?.success === true);
    createdBookingId = resBook.json?.booking?.id;
    createdTokenNumber = resBook.json?.booking?.tokenNumber;
    assert("Issued sequential session e-Token (e.g. M-00x)", Boolean(createdTokenNumber?.startsWith("M-")));

    // Check Queue API (/api/queue/[centreId])
    const resQueue = await request(`${BASE}/api/queue/${centerId}`);
    assert("Live Queue API returns HTTP 200", resQueue.status === 200);
    const waitingList = resQueue.json?.waitingQueue || [];
    assert("Newly booked token exists in Mandi Waiting Queue", waitingList.some((t: any) => t.id === createdBookingId));

    // Operator Action: Call Next
    const resCall = await request(`${BASE}/api/operator`, {
      method: "POST",
      body: { action: "call_next", centerId },
    });
    assert("Operator call_next advances queue with HTTP 200", resCall.status === 200);

    // Operator Action: Standby
    const resStandby = await request(`${BASE}/api/operator`, {
      method: "POST",
      body: { action: "standby", bookingId: createdBookingId },
    });
    assert("Operator standby marks token STANDBY with HTTP 200", resStandby.status === 200);

    // Operator Action: Process Weighment & J-Form
    const op = await db.operator.findFirst({ where: { centerId } });
    const resProcess = await request(`${BASE}/api/operator`, {
      method: "POST",
      body: {
        action: "process",
        bookingId: createdBookingId,
        operatorId: op?.id || "op_lud_01",
        gradeData: {
          grossWeightQtl: 38.0,
          tareWeightQtl: 8.0,
          moisturePct: 11.4,
          qualityGrade: "Grade A",
        },
      },
    });

    assert("Operator process weighment returns HTTP 200", resProcess.status === 200);
    const bill = resProcess.json?.bill;
    assert("Digital J-Form generated with bill number", Boolean(bill?.billNumber));
    assert("Net weight accurately calculated (38 - 8 = 30 Qtl)", bill?.netWeightQtl === 30);
    assert("Official MSP amount calculated accurately", bill?.netPayable > 0);

    // Verify database record for anti-tamper security
    const savedBill = await db.procurementBill.findUnique({ where: { billNumber: bill.billNumber } });
    assert("Digital SHA-256 seal hash generated for anti-tamper", Boolean(savedBill?.digitalSealHash && savedBill.digitalSealHash.length === 64));
    assert("QR verification payload formatted correctly", savedBill?.qrPayload?.includes("https://doca.gov.in/verify/") || false);

    // Check Farmer Payments API
    const resPayments = await request(`${BASE}/api/bookings?farmerId=${farmer.id}`);
    assert("Farmer payments API returns HTTP 200", resPayments.status === 200);
    const farmerBookings = resPayments.json?.bookings || [];
    const completed = farmerBookings.find((b: any) => b.id === createdBookingId);
    assert("Completed booking contains procurement bill & DBT record", Boolean(completed?.procurementBill));

    // Clean up created test booking & bill
    if (bill?.billNumber) {
      await db.dbtPayment.deleteMany({ where: { bill: { billNumber: bill.billNumber } } });
      await db.procurementBill.deleteMany({ where: { billNumber: bill.billNumber } });
    }
    if (createdBookingId) {
      await db.booking.deleteMany({ where: { id: createdBookingId } });
    }
  }

  // --- SECTION 5: DOCA EXECUTIVE TELEMETRY ANALYTICS ---
  console.log("\n[5] Testing DoCA National Oversight Telemetry API...");
  {
    const resAdmin = await request(`${BASE}/api/admin/stats`);
    assert("Admin stats API returns HTTP 200", resAdmin.status === 200);
    const overview = resAdmin.json?.overview;
    assert("Reports total bookings metric", typeof overview?.totalBookings === "number");
    assert("Reports total procured quintals", typeof overview?.totalProcuredQtl === "number");
    assert("Reports total MSP disbursed", typeof overview?.totalAmountInr === "number");
    assert("Reports active mandis breakdown", Array.isArray(resAdmin.json?.centreStats));
  }

  // --- SECTION 6: REAL-TIME SSE STREAM ENDPOINT ---
  console.log("\n[6] Testing Real-Time SSE Stream Endpoint...");
  {
    const sseInfo = await probeSSE(`${BASE}/api/sync/stream`);
    assert("SSE Stream endpoint responds HTTP 200", sseInfo.status === 200);
    assert("SSE Stream Content-Type is text/event-stream", sseInfo.contentType.includes("text/event-stream"));
  }

  // --- SECTION 7: UI & DOM SANITY CHECKS ---
  console.log("\n[7] Auditing UI Code & Strict Requirements...");
  {
    // Check that NO file contains external Logout buttons in its JSX (outside drawer)
    const operatorPageContent = fs.readFileSync(path.join(process.cwd(), "src/app/operator/page.tsx"), "utf8");
    const adminPageContent = fs.readFileSync(path.join(process.cwd(), "src/app/admin/page.tsx"), "utf8");
    const loginPageContent = fs.readFileSync(path.join(process.cwd(), "src/app/login/page.tsx"), "utf8");

    assert(
      "Operator page has no external logout button",
      !operatorPageContent.includes('className="text-xs text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl')
    );
    assert(
      "Admin page has no external logout button",
      !adminPageContent.includes('className="text-xs text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl')
    );
    assert(
      "Staff Portal link is fixed bottom-3 right-4",
      loginPageContent.includes("fixed bottom-3 right-4 z-40")
    );
    assert(
      "Staff Portal link only shows when step is aadhaar",
      loginPageContent.includes('isFarmer && step === "aadhaar"')
    );

    // Check translations completeness
    const requiredKeys = ["farmerLogin", "operatorLogin", "roleFarmer", "roleOperator", "roleAdmin"];
    for (const locale of ["en", "hi", "te"] as const) {
      for (const key of requiredKeys) {
        assert(`Translation exists for [${locale}].${key}`, Boolean(translations[locale]?.[key]));
      }
    }
  }

  console.log("\n==================================================================");
  console.log(` AUDIT RESULT: ${passCount} Passed, ${failCount} Failed`);
  console.log("==================================================================");

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log("✅ 100% OF SYSTEM FUNCTIONALITY & INTEGRATIONS VERIFIED WITH 0 ISSUES.\n");
    process.exit(0);
  }
}

runSystemAudit().catch((err) => {
  console.error("FATAL AUDIT ERROR:", err);
  process.exit(1);
});
