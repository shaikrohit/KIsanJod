/**
 * src/lib/handlingDuration.ts
 * Authoritative Mandi Handling Duration & Labor Gang Throughput Engine for KisanJod.
 * 
 * Based on empirical APMC Mandi & e-NAM unloading logistics:
 * - Unloading bay labor is organized into palledar / hamal gangs (standard 2 workers per bay).
 * - Gunny Bags (50kg jute bags for Wheat, Paddy, Pulses, Potato, Onion):
 *     Average handling rate = ~4.0 minutes per bag (unloading from trolley, tare check, sampling & stacking).
 *     Example: 10 bags * 4 min = 40 minutes (e.g. 09:00 - 09:40).
 *     Example: 5 bags * 4 min = 20 minutes (e.g. 09:40 - 10:00).
 * - Produce Crates (25kg plastic agri crates for Tomato, delicate vegetables):
 *     Average handling rate = ~2.5 minutes per crate.
 *     Example: 10 crates * 2.5 min = 25 minutes.
 * Mandi Unloading & Palledar Logistics:
 * - Default standard Hamal / Palledar labor gang size = 4 workers.
 * - Base rate = 3.0 minutes per bag average (or 2.0 minutes per crate).
 * - Surcharges for load size & fatigue:
 *     - If count > 20 bags: +5 minutes
 *     - If count > 40 bags: +6 additional minutes (cumulative +11 min)
 * - Worker Gang Concurrency:
 *     Duration = Math.max(10, Math.ceil((packageCount * baseMinutesPerUnit) / (workers / 2)))
 *     where default workers = 2 (standard Indian mandi palledar pair).
 * - Operational Tolerance Buffer:
 *     ±5 to 10 minutes precision window to accommodate weighbridge and sampling variation.
 *     - 4 workers (standard baseline): 1.0x multiplier
 *     - 2 workers: 0.6x multiplier
 *     - 1 worker: 0.35x multiplier
 *     - 6 workers: 1.25x multiplier
 *     - 8 workers: 1.45x multiplier
 */

export interface HandlingModelInput {
  packageCount: number;
  unitType: "GUNNY_BAG_50KG" | "CRATE_25KG" | "QUINTALS";
  capacityKg?: number;
  cropName?: string;
  activeWorkers?: number; // active laborers in mandi gang (default: 4)
}

export interface HandlingModelOutput {
  packageCount: number;
  unitType: "GUNNY_BAG_50KG" | "CRATE_25KG" | "QUINTALS";
  unitLabelEn: string;
  unitLabelHi: string;
  unitLabelTe: string;
  baseRatePerUnitMin: number;
  totalDurationMinutes: number;
  bufferMinutes: number;
  netWeightQuintals: number;
  activeWorkers: number;
  durationFormatted: string;
  breakdownDescription: string;
  laborInsight: string;
}

/**
 * Format duration in human-readable hours and minutes:
 * e.g. 45 -> "45 min"
 * e.g. 60 -> "1 hour"
 * e.g. 80 -> "1 hour 20 min"
 * e.g. 140 -> "2 hours 20 min"
 */
export function formatDurationHoursMinutes(minutes: number, approx: boolean = false): string {
  const totalM = Math.max(1, Math.round(minutes));
  const prefix = approx ? "~" : "";

  if (totalM < 60) {
    return `${prefix}${totalM} min`;
  }

  const hours = Math.floor(totalM / 60);
  const remM = totalM % 60;
  const hourLabel = hours === 1 ? "1 hour" : `${hours} hours`;

  if (remM === 0) {
    return `${prefix}${hourLabel}`;
  }

  return `${prefix}${hourLabel} ${remM} min`;
}

export function calculateHandlingDuration(input: HandlingModelInput): HandlingModelOutput {
  const count = Math.max(1, Math.round(input.packageCount || 1));
  const workers = Math.max(1, Math.min(10, input.activeWorkers || 4));
  const isCrate = input.unitType === "CRATE_25KG";
  const capacityKg = input.capacityKg || (isCrate ? 25 : 50);

  // Net weight in metric quintals (1 quintal = 100 kg)
  const netWeightQuintals = parseFloat(((count * capacityKg) / 100).toFixed(2));

  // Base handling rate per container: 3.0 min/bag, 2.0 min/crate
  const baseRate = isCrate ? 2.0 : 3.0;

  // Cumulative surcharges based on load size
  let surchargeMinutes = 0;
  if (count > 20) surchargeMinutes += 5;
  if (count > 40) surchargeMinutes += 6;

  // Worker gang scaling relative to standard 4 workers baseline
  let workerMultiplier = 1.0;
  if (workers <= 1) workerMultiplier = 0.35;
  else if (workers === 2) workerMultiplier = 0.6;
  else if (workers === 3) workerMultiplier = 0.8;
  else if (workers === 4) workerMultiplier = 1.0;
  else if (workers <= 6) workerMultiplier = 1.25;
  else workerMultiplier = 1.45;

  // Raw duration calculation
  const rawMinutes = Math.ceil(((count * baseRate) + surchargeMinutes) / workerMultiplier);
  // Guarantee a minimum reasonable window of 10 minutes for gate weighment and inspection
  const totalDurationMinutes = Math.max(10, rawMinutes);

  // Buffer: 5 min for short duration (<= 30 min), 10 min for longer
  const bufferMinutes = totalDurationMinutes <= 30 ? 5 : 10;

  const unitLabelEn = isCrate ? "Crates" : "Gunny Bags";
  const unitLabelHi = isCrate ? "क्रेट्स" : "बोरी";
  const unitLabelTe = isCrate ? "క్రేట్లు" : "గోనె సంచులు";

  const durationFormatted = `${formatDurationHoursMinutes(totalDurationMinutes, true)} (±${bufferMinutes}m buffer)`;
  const breakdownDescription = `${count} ${unitLabelEn} × ~${baseRate} min/${isCrate ? "crate" : "bag"} (${workers} active palledar workers)`;
  const laborInsight = workers !== 4
    ? `Configured with ${workers}-worker gang (~${(baseRate / workerMultiplier).toFixed(1)} min/${isCrate ? "crate" : "bag"})`
    : `Standard APMC 4-worker palledar gang (~${baseRate} min/${isCrate ? "crate" : "bag"})`;

  return {
    packageCount: count,
    unitType: input.unitType,
    unitLabelEn,
    unitLabelHi,
    unitLabelTe,
    baseRatePerUnitMin: baseRate,
    totalDurationMinutes,
    bufferMinutes,
    netWeightQuintals,
    activeWorkers: workers,
    durationFormatted,
    breakdownDescription,
    laborInsight,
  };
}

/**
 * Calculates continuous end time given a start time string "HH:mm" and duration in minutes
 */
export function addMinutesToTimeString(timeStr: string, minutesToAdd: number): string {
  const [hStr, mStr] = timeStr.split(":");
  const hours = parseInt(hStr, 10) || 0;
  const mins = parseInt(mStr, 10) || 0;
  const totalMins = hours * 60 + mins + minutesToAdd;
  const newHours = Math.floor(totalMins / 60) % 24;
  const newMins = totalMins % 60;
  return `${String(newHours).padStart(2, "0")}:${String(newMins).padStart(2, "0")}`;
}
