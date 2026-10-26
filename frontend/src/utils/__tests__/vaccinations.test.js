import { describe, expect, it } from "vitest";
import { dueStatus } from "../vaccinations";

const now = new Date(2026, 5, 10, 9, 0);

describe("dueStatus", () => {
  it("returns null when there is no due date", () => {
    expect(dueStatus(null, now)).toBeNull();
    expect(dueStatus("", now)).toBeNull();
  });

  it("flags past dates as overdue", () => {
    expect(dueStatus("2026-06-09", now)).toEqual({ label: "Overdue", color: "red" });
  });

  it("flags today through 14 days ahead as due soon", () => {
    expect(dueStatus("2026-06-10", now)?.label).toBe("Due soon");
    expect(dueStatus("2026-06-24", now)?.label).toBe("Due soon");
  });

  it("ignores dates further out", () => {
    expect(dueStatus("2026-06-25", now)).toBeNull();
  });
});
