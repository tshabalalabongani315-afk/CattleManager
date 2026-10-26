import { describe, expect, it } from "vitest";
import { daysBetween, daysUntil, formatDate, parseLocalDate, todayISO } from "../dates";

describe("dates", () => {
  it("parses a date-only string as local midnight (no timezone drift)", () => {
    const d = parseLocalDate("2026-03-09");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 9]);
    expect(parseLocalDate("")).toBeNull();
    expect(parseLocalDate(null)).toBeNull();
  });

  it("accepts full ISO timestamps by using only the date part", () => {
    expect(parseLocalDate("2026-03-09T00:00:00.000Z").getDate()).toBe(9);
  });

  it("formats todayISO from local date parts", () => {
    expect(todayISO(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(todayISO(new Date(2026, 11, 31, 0, 1))).toBe("2026-12-31");
  });

  it("formats for display and tolerates empty input", () => {
    expect(formatDate("2026-03-09")).toBe("9 Mar 2026");
    expect(formatDate(null)).toBe("—");
    expect(formatDate("garbage")).toBe("—");
  });

  it("counts whole days between dates", () => {
    expect(daysBetween("2026-01-01", "2026-01-31")).toBe(30);
    expect(daysBetween("2026-02-01", "2026-01-01")).toBe(-31);
    expect(daysBetween(null, "2026-01-01")).toBeNull();
  });

  it("counts days until a date relative to a fixed 'now'", () => {
    const now = new Date(2026, 5, 10, 15, 0);
    expect(daysUntil("2026-06-10", now)).toBe(0);
    expect(daysUntil("2026-06-24", now)).toBe(14);
    expect(daysUntil("2026-06-01", now)).toBe(-9);
  });
});
