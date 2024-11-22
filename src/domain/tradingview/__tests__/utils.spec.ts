import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentCandleTime } from "../utils";

describe("utils", () => {
  // Asia/Dubai 4 pm 19th Nov 2024
  const currentDate = new Date("2024-11-19T16:00:00+04:00");

  const currentTimeSeconds = Math.floor(currentDate.getTime() / 1000);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(currentDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getCurrentCandleTime", () => {
    it("should return the current period start", () => {
      const result = getCurrentCandleTime("1m");
      expect(result).toBe(currentTimeSeconds);

      // elapse 1s
      vi.advanceTimersByTime(1000);
      const result2 = getCurrentCandleTime("1m");
      expect(result2).toBe(currentTimeSeconds);

      // elapse 60s
      vi.advanceTimersByTime(60000);
      const result3 = getCurrentCandleTime("1m");
      expect(result3).toBe(currentTimeSeconds + 60);
    });
  });
});
