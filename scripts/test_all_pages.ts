import http from "http";

function fetchUrl(url: string, options: http.RequestOptions = {}, postData?: any): Promise<{ status: number; body: string; json?: any }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || 3000,
      path: parsed.pathname + parsed.search,
      method: options.method || "GET",
      headers: {
        "User-Agent": "KisanJod-Test-Suite",
        ...(postData ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(JSON.stringify(postData)) } : {}),
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
        resolve({ status: res.statusCode || 0, body, json });
      });
    });

    req.on("error", reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runAudit() {
  console.log("=================================================");
  console.log("    COMPREHENSIVE MULTI-PAGE SYSTEM AUDIT       ");
  console.log("=================================================");

  const BASE = "http://localhost:3000";
  let errorsFound = 0;

  // 1. Page Routes
  const pages = [
    "/",
    "/login",
    "/farmer/dashboard",
    "/farmer/book",
    "/farmer/book?category=Vegetables",
    "/farmer/book?category=Grains",
    "/farmer/book?crop=Paddy",
    "/farmer/queue",
    "/farmer/payments",
    "/operator",
    "/admin",
  ];

  console.log("\n[1] Testing Page Routes (HTML 200 OK):");
  for (const page of pages) {
    try {
      const res = await fetchUrl(BASE + page);
      if (res.status === 200) {
        console.log(`  ✓ [HTTP 200] ${page} (${res.body.length} bytes)`);
      } else {
        console.error(`  ✗ [HTTP ${res.status}] ${page}`);
        errorsFound++;
      }
    } catch (e: any) {
      console.error(`  ✗ [ERROR] ${page} -> ${e.message}`);
      errorsFound++;
    }
  }

  // 2. Static Assets
  console.log("\n[2] Testing Static Assets (Icons & Images):");
  const assets = [
    "/icons/farmer-avatar.svg",
    "/icons/icon.svg",
    "/crops/wheat.jpg",
    "/crops/paddy.jpg",
    "/crops/tomato.jpg",
    "/crops/potato.jpg",
    "/crops/onion.jpg",
    "/crops/chana.jpg",
    "/crops/moong.jpg",
    "/manifest.json",
  ];
  for (const asset of assets) {
    try {
      const res = await fetchUrl(BASE + asset);
      if (res.status === 200) {
        console.log(`  ✓ [HTTP 200] ${asset} (${res.body.length} bytes)`);
      } else {
        console.error(`  ✗ [HTTP ${res.status}] ${asset}`);
        errorsFound++;
      }
    } catch (e: any) {
      console.error(`  ✗ [ERROR] ${asset} -> ${e.message}`);
      errorsFound++;
    }
  }

  // 3. Authentication Flow API
  console.log("\n[3] Testing Farmer Auth API Flow:");
  try {
    const loginRes = await fetchUrl(BASE + "/api/auth/login", { method: "POST" }, { aadhaarNumber: "123456789012" });
    if (loginRes.status === 200 && loginRes.json?.success) {
      console.log(`  ✓ Step 1 Send OTP Success: Farmer=${loginRes.json.fullName}, ID=${loginRes.json.farmerId}`);
      const otpRes = await fetchUrl(BASE + "/api/auth/verify-otp", { method: "POST" }, {
        farmerId: loginRes.json.farmerId,
        otp: "123456",
      });
      if (otpRes.status === 200 && otpRes.json?.success) {
        console.log(`  ✓ Step 2 Verify OTP Success: Masked UID=${otpRes.json.farmer.maskedAadhaar}`);
      } else {
        console.error(`  ✗ Step 2 Verify OTP Failed:`, otpRes.json);
        errorsFound++;
      }
    } else {
      console.error(`  ✗ Step 1 Send OTP Failed:`, loginRes.json);
      errorsFound++;
    }
  } catch (e: any) {
    console.error(`  ✗ Auth API error:`, e.message);
    errorsFound++;
  }

  // 4. Mandi Centres & Slot Engine API
  console.log("\n[4] Testing Mandi Centres & Continuous Slot Engine API:");
  let firstCentreId = "";
  try {
    const centresRes = await fetchUrl(BASE + "/api/centres");
    if (centresRes.status === 200 && centresRes.json?.centres?.length > 0) {
      firstCentreId = centresRes.json.centres[0].id;
      console.log(`  ✓ Retrieved ${centresRes.json.centres.length} Mandi Centres (1st: ${centresRes.json.centres[0].name})`);

      const today = new Date().toISOString().split("T")[0];
      const slotsRes = await fetchUrl(`${BASE}/api/centres/${firstCentreId}/slots?date=${today}&loadQtl=40&unitType=GUNNY_BAG_50KG&packageCount=80`);
      if (slotsRes.status === 200) {
        console.log(`  ✓ Slots API responded HTTP 200 for Centre ${firstCentreId} on ${today}`);
      } else {
        console.error(`  ✗ Slots API error HTTP ${slotsRes.status}`);
        errorsFound++;
      }
    } else {
      console.error(`  ✗ Failed to fetch centres:`, centresRes.json);
      errorsFound++;
    }
  } catch (e: any) {
    console.error(`  ✗ Centres error:`, e.message);
    errorsFound++;
  }

  // 5. Operator Console API
  console.log("\n[5] Testing Operator Auth & Console API:");
  try {
    const opLoginRes = await fetchUrl(BASE + "/api/operator/login", { method: "POST" }, {
      employeeId: "EMP-LUD-001",
      pin: "1234",
    });
    if (opLoginRes.status === 200 && opLoginRes.json?.success) {
      console.log(`  ✓ Operator Auth Success: ${opLoginRes.json.operator.fullName} at ${opLoginRes.json.operator.center?.name}`);
    } else {
      console.error(`  ✗ Operator Auth Failed:`, opLoginRes.json);
      errorsFound++;
    }
  } catch (e: any) {
    console.error(`  ✗ Operator login error:`, e.message);
    errorsFound++;
  }

  // 6. Admin Stats API
  console.log("\n[6] Testing Admin Stats API:");
  try {
    const adminRes = await fetchUrl(BASE + "/api/admin/stats");
    if (adminRes.status === 200) {
      console.log(`  ✓ Admin Stats Success: HTTP 200`);
    } else {
      console.error(`  ✗ Admin Stats Failed: HTTP ${adminRes.status}`);
      errorsFound++;
    }
  } catch (e: any) {
    console.error(`  ✗ Admin stats error:`, e.message);
    errorsFound++;
  }

  console.log("\n=================================================");
  console.log(`AUDIT COMPLETE. Errors Found: ${errorsFound}`);
  console.log("=================================================");

  if (errorsFound > 0) {
    process.exit(1);
  }
}

runAudit();
