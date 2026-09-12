// ============================================================================
// KisanJod - Time Formatting & Session Timeline Utilities
// Universal 12-Hour AM/PM conversion and session timeline proportional math
// ============================================================================

/**
 * Converts a 24-hour time string ("09:00", "13:30", "15:45") to 12-hour format ("9:00 AM", "1:30 PM", "3:45 PM").
 * If the input is already in 12-hour format or invalid, returns a safe fallback.
 */
export function to12Hour(time24?: string | null): string {
  if (!time24 || typeof time24 !== "string") return "";

  const trimmed = time24.trim();
  if (/am|pm/i.test(trimmed)) {
    return trimmed;
  }

  const parts = trimmed.split(":");
  if (parts.length < 2) return trimmed;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) return trimmed;

  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  const minutesStr = String(minutes).padStart(2, "0");

  return `${hours12}:${minutesStr} ${period}`;
}

/**
 * Converts a 12-hour time string ("9:00 AM", "1:30 PM") to 24-hour format ("09:00", "13:30").
 */
export function to24Hour(time12?: string | null): string {
  if (!time12 || typeof time12 !== "string") return "09:00";

  const trimmed = time12.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return trimmed;

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3]?.toUpperCase();

  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

/**
 * Formats start and end times into a clean 12-hour range: "9:00 AM – 1:00 PM"
 */
export function formatTimeRange12h(start24: string, end24: string): string {
  return `${to12Hour(start24)} – ${to12Hour(end24)}`;
}

/**
 * Formats start and end times into an approximate 12-hour range: "~9:00 AM – ~10:30 AM"
 */
export function formatApproxTimeRange12h(start24: string, end24: string): string {
  const start12 = to12Hour(start24);
  const end12 = to12Hour(end24);
  return `~${start12} – ~${end12}`;
}

/**
 * Converts "HH:mm" to total minutes from midnight (e.g. "09:30" -> 570)
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(":")) return 540; // Default 9:00 AM
  const [h, m] = timeStr.split(":").map((v) => parseInt(v, 10));
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

/**
 * Converts minutes from midnight to "HH:mm" (e.g. 570 -> "09:30")
 */
export function minutesToTimeStr(minutes: number): string {
  const bounded = Math.max(0, Math.min(24 * 60 - 1, minutes));
  const h = Math.floor(bounded / 60);
  const m = Math.floor(bounded % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Calculates CSS percentage left offset and width for rendering timeline segments proportionally.
 */
export function calculateTimelineProportions(
  start24: string,
  end24: string,
  sessionStart24: string,
  sessionEnd24: string
): { leftPercent: number; widthPercent: number } {
  const sessionStartMin = timeToMinutes(sessionStart24);
  const sessionEndMin = timeToMinutes(sessionEnd24);
  const totalSessionMin = Math.max(1, sessionEndMin - sessionStartMin);

  const startMin = Math.max(sessionStartMin, timeToMinutes(start24));
  const endMin = Math.min(sessionEndMin, timeToMinutes(end24));

  const leftPercent = Math.max(0, Math.min(100, ((startMin - sessionStartMin) / totalSessionMin) * 100));
  const widthPercent = Math.max(1, Math.min(100 - leftPercent, ((Math.max(0, endMin - startMin)) / totalSessionMin) * 100));

  return { leftPercent, widthPercent };
}
