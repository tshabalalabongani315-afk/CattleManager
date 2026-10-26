import { daysUntil } from "./dates";

/** Returns { label, color } when a vaccination needs attention, otherwise null. */
export function dueStatus(nextDueDate, now = new Date()) {
  const diffDays = daysUntil(nextDueDate, now);
  if (diffDays == null) return null;

  if (diffDays < 0) return { label: "Overdue", color: "red" };
  if (diffDays <= 14) return { label: "Due soon", color: "orange" };
  return null;
}
