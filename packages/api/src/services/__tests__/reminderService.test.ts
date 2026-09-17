import { describe, expect, it } from "vitest";

import { localDateString, localTimeString } from "../reminderService.js";

describe("reminderService date/time helpers", () => {
  it("formats the local date as YYYY-MM-DD", () => {
    // 2026-01-15T02:30:00Z is still 2026-01-14 in America/Los_Angeles (UTC-8 in January).
    const date = new Date("2026-01-15T02:30:00.000Z");
    expect(localDateString(date, "America/Los_Angeles")).toBe("2026-01-14");
    expect(localDateString(date, "UTC")).toBe("2026-01-15");
  });

  it("formats the local time as 24h HH:MM", () => {
    // 2026-06-01T23:15:00Z is 2026-06-02 08:15 in Asia/Tokyo (UTC+9).
    const date = new Date("2026-06-01T23:15:00.000Z");
    expect(localTimeString(date, "Asia/Tokyo")).toBe("08:15");
    expect(localTimeString(date, "UTC")).toBe("23:15");
  });

  it("crosses the date boundary consistently between the two helpers", () => {
    // US DST starts 2026-03-08, so by 2026-03-10 America/New_York is UTC-4 (EDT).
    const date = new Date("2026-03-10T04:00:00.000Z");
    expect(localDateString(date, "America/New_York")).toBe("2026-03-10");
    expect(localTimeString(date, "America/New_York")).toBe("00:00");
  });
});
