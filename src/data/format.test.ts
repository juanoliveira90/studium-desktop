import { describe, expect, it } from "vitest";
import { formatDateRange, formatShortDate } from "./format";

describe("formatShortDate", () => {
  it("formats vault ISO dates as short month-day labels", () => {
    expect(formatShortDate("2026-07-01")).toBe("Jul 1");
    expect(formatShortDate("2026-12-25")).toBe("Dec 25");
  });
});

describe("formatDateRange", () => {
  it("joins two short dates with an em dash", () => {
    expect(formatDateRange("2026-06-01", "2026-07-20")).toBe("Jun 1 — Jul 20");
  });
});
