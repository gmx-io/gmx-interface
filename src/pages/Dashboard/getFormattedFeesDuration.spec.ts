import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { getFormattedFeesDuration } from "./getFormattedFeesDuration";

describe("getFormattedFeesDuration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return only hours when less than 24 hours passed", () => {
    // Set current time to Wednesday 15:00 UTC
    const now = new Date("2024-03-20T15:00:00Z");
    vi.setSystemTime(now);

    const result = getFormattedFeesDuration();
    expect(result).toBe("15h");
  });

  it("should return days and hours when more than 24 hours passed", () => {
    // Set current time to Friday 15:00 UTC
    const now = new Date("2024-03-22T15:00:00Z");
    vi.setSystemTime(now);

    const result = getFormattedFeesDuration();
    expect(result).toBe("2d 15h");
  });

  it("should return only days when hours are 0", () => {
    // Set current time to Friday 00:00 UTC
    const now = new Date("2024-03-22T00:00:00Z");
    vi.setSystemTime(now);

    const result = getFormattedFeesDuration();
    expect(result).toBe("2d");
  });

  it("should return minimum 1h when less than an hour passed", () => {
    // Set current time to Wednesday 00:30 UTC
    const now = new Date("2024-03-20T00:30:00Z");
    vi.setSystemTime(now);

    const result = getFormattedFeesDuration();
    expect(result).toBe("1h");
  });

  it("should start counting from Wednesday 00:00 UTC", () => {
    // Set current time to exact Wednesday 00:00 UTC
    const now = new Date("2024-03-20T00:00:00Z");
    vi.setSystemTime(now);

    const result = getFormattedFeesDuration();
    expect(result).toBe("1h"); // Minimum 1h even at start
  });
});
