import { db } from "../src/lib/db";
import fs from "fs";

async function generateMocks() {
  const centres = await db.procurementCenter.findMany({
    orderBy: [{ state: "asc" }, { name: "asc" }],
  });

  const byState: Record<string, any[]> = {};
  for (const c of centres) {
    if (!byState[c.state]) byState[c.state] = [];
    const pinMatch = c.address.match(/\b\d{6}\b/);
    const pinCode = pinMatch ? pinMatch[0] : "500001";
    
    let addr = c.address.replace(new RegExp(",\\s*" + c.state + "\\s*\\d{6}$", "i"), "");

    byState[c.state].push({
      id: c.id,
      name: c.name,
      state: c.state,
      district: c.district,
      address: addr,
      pinCode,
      lat: c.latitude,
      lng: c.longitude,
      morningSessionStart: c.morningSessionStart,
      morningSessionEnd: c.morningSessionEnd,
      afternoonSessionStart: c.afternoonSessionStart,
      afternoonSessionEnd: c.afternoonSessionEnd,
      activeWorkers: c.activeWorkers,
      maxDailyCapacity: c.dailyCapacityQtl,
      isActive: c.isActive,
      speciality: c.district + " APMC Agricultural Yard",
    });
  }

  const code = `export interface MockProcurementCentre {
  id: string;
  name: string;
  state: string;
  district: string;
  address: string;
  pinCode: string;
  lat: number;
  lng: number;
  morningSessionStart: string;
  morningSessionEnd: string;
  afternoonSessionStart: string;
  afternoonSessionEnd: string;
  activeWorkers: number;
  maxDailyCapacity: number;
  isActive: boolean;
  speciality: string;
}

export const PROCUREMENT_CENTRES_BY_STATE: Record<string, MockProcurementCentre[]> = ${JSON.stringify(byState, null, 2)};

export const ALL_PROCUREMENT_CENTRES: MockProcurementCentre[] = Object.values(PROCUREMENT_CENTRES_BY_STATE).flat();

export const AVAILABLE_STATES: string[] = Object.keys(PROCUREMENT_CENTRES_BY_STATE);

export function getCentresByState(stateName: string): MockProcurementCentre[] {
  return PROCUREMENT_CENTRES_BY_STATE[stateName] || [];
}
`;

  fs.writeFileSync("src/lib/mocks/procurementCentres.ts", code, "utf-8");
  console.log(`Successfully generated clean procurementCentres.ts with ${centres.length} centres across ${Object.keys(byState).length} states.`);
}

generateMocks()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
