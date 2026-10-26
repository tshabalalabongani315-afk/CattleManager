import { afterEach, describe, expect, it, vi } from "vitest";
import { formatAge } from "../age";

afterEach(() => vi.useRealTimers());

describe("formatAge", () => {
  it("shows months under two years and years after", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15));
    expect(formatAge("2026-01-20")).toBe("4 mo");
    expect(formatAge("2024-07-01")).toBe("23 mo");
    expect(formatAge("2023-06-15")).toBe("3 yr");
  });

  it("returns null for missing or future dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15));
    expect(formatAge(null)).toBeNull();
    expect(formatAge("2030-01-01")).toBeNull();
  });
});
