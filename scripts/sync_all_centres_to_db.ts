import { PrismaClient } from "@prisma/client";
import { ALL_PROCUREMENT_CENTRES } from "../src/lib/mocks/procurementCentres";

const prisma = new PrismaClient();

async function syncCentres() {
  console.log(`Syncing ${ALL_PROCUREMENT_CENTRES.length} APMC procurement centres into the database...`);
  let upserted = 0;

  for (const c of ALL_PROCUREMENT_CENTRES) {
    const centerCode = c.id.toUpperCase().replace("CENTER_", "MND-");
    await prisma.procurementCenter.upsert({
      where: { id: c.id },
      update: {
        centerCode,
        name: c.name,
        state: c.state,
        district: c.district,
        address: `${c.address}, ${c.state} ${c.pinCode}`,
        latitude: c.lat,
        longitude: c.lng,
        baysCount: c.activeWorkers > 4 ? 3 : 2,
        activeWorkers: c.activeWorkers,
        maxDailySlots: Math.floor(c.maxDailyCapacity / 100),
        dailyCapacityQtl: c.maxDailyCapacity,
        morningSessionStart: c.morningSessionStart,
        morningSessionEnd: c.morningSessionEnd,
        afternoonSessionStart: c.afternoonSessionStart,
        afternoonSessionEnd: c.afternoonSessionEnd,
        isActive: c.isActive,
      },
      create: {
        id: c.id,
        centerCode,
        name: c.name,
        state: c.state,
        district: c.district,
        address: `${c.address}, ${c.state} ${c.pinCode}`,
        latitude: c.lat,
        longitude: c.lng,
        baysCount: c.activeWorkers > 4 ? 3 : 2,
        activeWorkers: c.activeWorkers,
        maxDailySlots: Math.floor(c.maxDailyCapacity / 100),
        dailyCapacityQtl: c.maxDailyCapacity,
        morningSessionStart: c.morningSessionStart,
        morningSessionEnd: c.morningSessionEnd,
        afternoonSessionStart: c.afternoonSessionStart,
        afternoonSessionEnd: c.afternoonSessionEnd,
        isActive: c.isActive,
      },
    });
    upserted++;
  }

  const count = await prisma.procurementCenter.count();
  console.log(`✅ Successfully synced ${upserted} centres! Total centres in DB: ${count}`);
}

syncCentres()
  .catch((e) => {
    console.error("Sync error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

