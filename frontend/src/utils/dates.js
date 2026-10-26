// Parses a date-only "YYYY-MM-DD" string (from an <input type="date"> or the
// API) as local midnight. `new Date("YYYY-MM-DD")` parses as UTC midnight
// instead, which skews the result by up to a day once read back with
// local-time getters (getMonth/getDate/getFullYear) for anyone not in UTC.
export function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = String(dateStr).slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

const pad = (n) => String(n).padStart(2, "0");

/** Today as YYYY-MM-DD in the user's own timezone (toISOString would give the UTC date). */
export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** 2026-03-09 -> "9 Mar 2026". Empty input -> "—". */
export function formatDate(dateStr) {
  const d = parseLocalDate(dateStr);
  if (!d || Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Whole days from date `a` to date `b` (both YYYY-MM-DD); negative if b is earlier. */
export function daysBetween(a, b) {
  const from = parseLocalDate(a);
  const to = parseLocalDate(b);
  if (!from || !to) return null;
  return Math.round((to - from) / 86_400_000);
}

/** Whole days from today (local) until the date; negative if in the past. */
export function daysUntil(dateStr, now = new Date()) {
  const due = parseLocalDate(dateStr);
  if (!due) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due - today) / 86_400_000);
}
