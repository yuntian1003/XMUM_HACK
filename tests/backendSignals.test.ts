import { describe, it, expect } from "vitest";
import { coerceNumber, getLiveFreshness } from "../frontend/src/lib/backendSignals";

describe("backendSignals", () => {
  describe("coerceNumber", () => {
    it("returns finite numbers directly", () => {
      expect(coerceNumber(42)).toBe(42);
      expect(coerceNumber(0)).toBe(0);
      expect(coerceNumber(-12.5)).toBe(-12.5);
    });

    it("parses valid numeric strings", () => {
      expect(coerceNumber("123")).toBe(123);
      expect(coerceNumber("3.1415")).toBe(3.1415);
      expect(coerceNumber(" -99 ")).toBe(-99);
    });

    it("returns null for non-numeric or invalid inputs", () => {
      expect(coerceNumber(null)).toBeNull();
      expect(coerceNumber(undefined)).toBeNull();
      expect(coerceNumber("")).toBeNull();
      expect(coerceNumber("abc")).toBeNull();
      expect(coerceNumber(NaN)).toBeNull();
      expect(coerceNumber(Infinity)).toBeNull();
    });
  });

  describe("getLiveFreshness", () => {
    it("returns stale with 'Update pending' when no runs exist", () => {
      const freshness = getLiveFreshness(undefined);
      expect(freshness.state).toBe("stale");
      expect(freshness.label).toBe("Update pending");
      expect(freshness.startedAt).toBeNull();
    });

    it("returns failed when latest run was unsuccessful", () => {
      const freshness = getLiveFreshness({
        lastRuns: [{ success: false, startedAt: "2026-10-24T12:00:00Z" }],
      });
      expect(freshness.state).toBe("failed");
      expect(freshness.label).toBe("Update failed");
      expect(freshness.startedAt).toBe("2026-10-24T12:00:00Z");
    });

    it("returns fresh for successful runs within 24 hours", () => {
      const recentDate = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const freshness = getLiveFreshness({
        lastRuns: [{ success: true, startedAt: recentDate }],
      });
      expect(freshness.state).toBe("fresh");
      expect(freshness.label).toContain("Updated");
    });

    it("returns stale for successful runs older than 24 hours", () => {
      const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const freshness = getLiveFreshness({
        lastRuns: [{ success: true, startedAt: oldDate }],
      });
      expect(freshness.state).toBe("stale");
      expect(freshness.label).toContain("Updated");
    });
  });
});
