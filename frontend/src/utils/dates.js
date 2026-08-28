// Parses a date-only "YYYY-MM-DD" string (from an <input type="date">) as
// local midnight. `new Date("YYYY-MM-DD")` parses as UTC midnight instead,
// which skews the result by up to a day once read back with local-time
// getters (getMonth/getDate/getFullYear) for anyone not in the UTC timezone.
export function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}
