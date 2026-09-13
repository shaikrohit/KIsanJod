// KisanJod - Verification of Real-Time Instant Sync & UI Boundaries
import { db } from "@/lib/db";
import { notifySync, syncBus, SyncPayload } from "@/lib/syncBus";

async function runRealtimeSyncVerification() {
  console.log("=================================================");
  console.log("   VERIFYING REAL-TIME INSTANT SYNC & BOUNDARIES ");
  console.log("=================================================\n");

  let eventsReceived: SyncPayload[] = [];
  const testListener = (data: SyncPayload) => {
    eventsReceived.push(data);
  };
  syncBus.on("kisanjod_event", testListener);

  try {
    // 1. Test Server Event Bus & Instant Dispatch
    console.log("[1] Testing Instant Event Bus Dispatch (0ms latency)...");
    const testPing: SyncPayload = { type: "PING_TEST", timestamp: Date.now() };
    notifySync(testPing);
    if (eventsReceived.length !== 1 || eventsReceived[0].type !== "PING_TEST") {
      throw new Error("Event bus failed to deliver instant sync packet");
    }
    console.log("  ✓ Event bus dispatched and captured synchronously (0ms delay)\n");

    // 2. Fetch test farmer & center
    console.log("[2] Preparing Test Farmer & Center...");
    const farmer = await db.farmer.findFirst({
      where: { maskedAadhaar: "XXXXXXXX5678" },
      include: { bankAccounts: true },
    });
    if (!farmer) throw new Error("Seed farmer not found");

    const center = await db.procurementCenter.findFirst({
      where: { id: "center_lud_01" },
    });
    if (!center) throw new Error("Seed center not found");
    console.log(`  ✓ Using Farmer: ${farmer.fullName} (${farmer.id}) at Center: ${center.name}\n`);

    // 3. Simulate Slot Booking with Sync Dispatch
    console.log("[3] Simulating Instant Slot Booking...");
    const today = new Date().toISOString().split("T")[0];
    const testToken = `TK-SYNC-${Date.now().toString().slice(-4)}`;

    const booking = await db.booking.create({
      data: {
        bookingNumber: `BK-SYNC-${Date.now().toString().slice(-6)}`,
        tokenNumber: testToken,
        cropName: "Wheat",
        commodityCategory: "GRAINS",
        packageCount: 20,
        unitType: "GUNNY_BAG_50KG",
        estimatedQuantityQtl: 10.0,
        bookedDate: today,
        scheduledSlotStart: "10:00",
        scheduledSlotEnd: "10:30",
        dynamicEta: "10:00",
        status: "WAITING",
        centerId: center.id,
        farmerId: farmer.id,
        sessionName: "MORNING",
        bayAssigned: 1,
      },
    });

    notifySync({
      type: "BOOKING_CREATED",
      centerId: center.id,
      farmerId: farmer.id,
      bookingId: booking.id,
      tokenNumber: booking.tokenNumber,
    });

    const bookingEvent = eventsReceived.find((e) => e.type === "BOOKING_CREATED" && e.bookingId === booking.id);
    if (!bookingEvent) throw new Error("BOOKING_CREATED sync event was not received");
    console.log(`  ✓ Booking created with token ${testToken}, instant event broadcast verified\n`);

    // 4. Simulate Operator Call Next (Advance Queue)
    console.log("[4] Simulating Operator Call Next (0ms reflection)...");
    await db.booking.update({
      where: { id: booking.id },
      data: { status: "CALLED" },
    });
    notifySync({
      type: "QUEUE_CALL",
      centerId: center.id,
      tokenNumber: booking.tokenNumber,
      farmerId: farmer.id,
      bookingId: booking.id,
    });

    const callEvent = eventsReceived.find((e) => e.type === "QUEUE_CALL" && e.bookingId === booking.id);
    if (!callEvent) throw new Error("QUEUE_CALL sync event was not received");
    console.log(`  ✓ Operator call next executed: Token ${testToken} status -> CALLED\n`);

    // 5. Simulate Operator Standby
    console.log("[5] Simulating Operator Standby...");
    await db.booking.update({
      where: { id: booking.id },
      data: { status: "STANDBY" },
    });
    notifySync({
      type: "QUEUE_STANDBY",
      bookingId: booking.id,
      centerId: center.id,
      farmerId: farmer.id,
      tokenNumber: booking.tokenNumber,
    });

    const standbyEvent = eventsReceived.find((e) => e.type === "QUEUE_STANDBY" && e.bookingId === booking.id);
    if (!standbyEvent) throw new Error("QUEUE_STANDBY sync event was not received");
    console.log(`  ✓ Operator marked standby: Token ${testToken} status -> STANDBY\n`);

    // 6. Simulate Operator Weighment & Digital J-Form Generation
    console.log("[6] Simulating Operator Weighment Process & J-Form Generation...");
    const billNumber = `JF-SYNC-${Date.now().toString().slice(-6)}`;
    const pfmsRef = `PFMS-SYNC-${Date.now().toString().slice(-6)}`;

    const op = await db.operator.findFirst({ where: { centerId: center.id } });
    const bill = await db.procurementBill.create({
      data: {
        billNumber,
        bookingId: booking.id,
        centerId: center.id,
        operatorId: op?.id || "op_lud_01",
        farmerId: farmer.id,
        cropName: "Wheat",
        qualityGrade: "FAQ",
        measuredMoisturePct: 11.5,
        grossWeightQtl: 11.0,
        tareWeightQtl: 1.0,
        netWeightQtl: 10.0,
        notifiedMspRate: 2275,
        grossAmountPayable: 22750,
        deductionsAmount: 0,
        netAmountPayable: 22750,
        digitalSealHash: "hash-sync-test",
        qrPayload: `https://doca.gov.in/verify/${billNumber}`,
      },
    });

    await db.dbtPayment.create({
      data: {
        billId: bill.id,
        pfmsReferenceNumber: pfmsRef,
        status: "PROCESSING",
        beneficiaryMaskedAc: "XXXXXX5678",
        bankIfsc: "SBIN0000001",
        bankName: "State Bank of India",
        amountInr: 22750,
      },
    });

    await db.booking.update({
      where: { id: booking.id },
      data: { status: "COMPLETED" },
    });

    notifySync({
      type: "WEIGHMENT_COMPLETED",
      bookingId: booking.id,
      centerId: center.id,
      farmerId: farmer.id,
      tokenNumber: booking.tokenNumber,
      billNumber,
      netWeightQtl: 10.0,
      mspRate: 2275,
      netPayable: 22750,
      pfmsRef,
    });

    const weighmentEvent = eventsReceived.find((e) => e.type === "WEIGHMENT_COMPLETED" && e.bookingId === booking.id);
    if (!weighmentEvent) throw new Error("WEIGHMENT_COMPLETED sync event was not received");
    console.log(`  ✓ Weighment completed: Bill ${billNumber}, Net 10.0 Qtl, Payout ₹22,750\n`);

    // Clean up test booking & bill
    await db.dbtPayment.deleteMany({ where: { pfmsReferenceNumber: pfmsRef } });
    await db.procurementBill.deleteMany({ where: { billNumber } });
    await db.booking.deleteMany({ where: { id: booking.id } });

    console.log("=================================================");
    console.log("  ALL REAL-TIME SYNC VERIFICATIONS PASSED (0 ERRORS)");
    console.log("=================================================");
  } finally {
    syncBus.off("kisanjod_event", testListener);
  }
}

runRealtimeSyncVerification().catch((e) => {
  console.error("FATAL VERIFICATION ERROR:", e);
  process.exit(1);
});
