import { parseLocalDate } from "./dates";

export function dueStatus(nextDueDate) {
  if (!nextDueDate) return null;
  const due = parseLocalDate(nextDueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due - today) / 86400000);

  if (diffDays < 0) return { label: "Overdue", color: "red" };
  if (diffDays <= 14) return { label: "Due soon", color: "orange" };
  return null;
}
