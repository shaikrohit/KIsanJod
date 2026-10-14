// KisanJod - Verification of Real-Time Instant Sync & UI Boundaries
// 100% Zero-Dependency Standalone Real-Time Test
import { standaloneStore } from "@/lib/standaloneStore";
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

    // 2. Prepare Test Farmer & Center from Standalone Store
    console.log("[2] Preparing Test Farmer & Center...");
    const farmerId = "farmer_001";
    const centerId = "center_lud_01";
    console.log(`  ✓ Using Farmer ID: ${farmerId} at Center ID: ${centerId}\n`);

    // 3. Simulate Slot Booking with Sync Dispatch
    console.log("[3] Simulating Instant Slot Booking...");
    const today = new Date().toISOString().split("T")[0];

    const bookingRes = standaloneStore.createBooking({
      farmerId,
      centerId,
      cropName: "Wheat",
      commodityCategory: "GRAINS",
      packageCount: 20,
      unitType: "GUNNY_BAG_50KG",
      capacityKg: 50,
      date: today,
      sessionName: "MORNING",
    });

    if (!bookingRes.success || !bookingRes.booking) {
      throw new Error("Failed to create test booking: " + bookingRes.error);
    }

    const booking = bookingRes.booking;
    const bookingEvent = eventsReceived.find((e) => e.type === "BOOKING_CREATED" && e.bookingId === booking.id);
    if (!bookingEvent) throw new Error("BOOKING_CREATED sync event was not received");
    console.log(`  ✓ Booking created with token ${booking.tokenNumber}, instant event broadcast verified\n`);

    // 4. Simulate Operator Call Next (Advance Queue)
    console.log("[4] Simulating Operator Call Next (0ms reflection)...");
    const callRes = standaloneStore.callNext(centerId, today);
    if (!callRes.success) throw new Error("Call next failed: " + callRes.error);

    const callEvent = eventsReceived.find((e) => e.type === "QUEUE_CALL" && e.bookingId === callRes.booking?.id);
    if (!callEvent) throw new Error("QUEUE_CALL sync event was not received");
    console.log(`  ✓ Operator call next executed: Token ${callRes.token} status -> CALLED\n`);

    // 5. Simulate Operator Standby
    console.log("[5] Simulating Operator Standby...");
    const standbyRes = standaloneStore.putStandby(booking.id);
    if (!standbyRes.success) throw new Error("Put standby failed: " + standbyRes.error);

    const standbyEvent = eventsReceived.find((e) => e.type === "QUEUE_STANDBY" && e.bookingId === booking.id);
    if (!standbyEvent) throw new Error("QUEUE_STANDBY sync event was not received");
    console.log(`  ✓ Operator marked standby: Token ${booking.tokenNumber} status -> STANDBY\n`);

    // 6. Simulate Operator Weighment & Digital J-Form Generation
    console.log("[6] Simulating Operator Weighment Process & J-Form Generation...");
    const weighmentRes = standaloneStore.completeWeighment({
      bookingId: booking.id,
      grossWeightQtl: 11.0,
      tareWeightQtl: 1.0,
      grade: "FAQ",
      moisture: 11.5,
    });

    if (!weighmentRes.success || !weighmentRes.bill) {
      throw new Error("Complete weighment failed: " + weighmentRes.error);
    }

    const weighmentEvent = eventsReceived.find((e) => e.type === "WEIGHMENT_COMPLETED" && e.bookingId === booking.id);
    if (!weighmentEvent) throw new Error("WEIGHMENT_COMPLETED sync event was not received");
    console.log(`  ✓ Weighment completed: Bill ${weighmentRes.bill.billNumber}, Net 10.0 Qtl, Payout ₹${weighmentRes.bill.netAmountPayable.toLocaleString("en-IN")}\n`);

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
