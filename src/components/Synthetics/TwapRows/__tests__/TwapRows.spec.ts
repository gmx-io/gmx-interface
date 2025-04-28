import { describe, expect, it } from "vitest";

import { getTwapDurationText } from "../TwapRows";

describe("TwapRows", () => {
  describe("getTwapDurationText", () => {
    it("should return 'less than a minute' for 0 seconds", () => {
      expect(getTwapDurationText({ hours: 0, minutes: 0 })).toBe("less than a minute");
    });

    it("should return '1 minute' for 1 minute", () => {
      expect(getTwapDurationText({ hours: 0, minutes: 1 })).toBe("1 minute");
    });

    it("should return '1 hour' for 1 hour", () => {
      expect(getTwapDurationText({ hours: 1, minutes: 0 })).toBe("1 hour");
    });

    it("should return '2 hours and 1 minute' for 2 hours and 1 minute", () => {
      expect(getTwapDurationText({ hours: 2, minutes: 1 })).toBe("2 hours and 1 minute");
    });

    it("should return '2 hours' for 2 hours", () => {
      expect(getTwapDurationText({ hours: 2, minutes: 0 })).toBe("2 hours");
    });

    it("should return '25 hours' for 25 hours", () => {
      expect(getTwapDurationText({ hours: 25, minutes: 0 })).toBe("25 hours");
    });

    it("should return '48 hours' for 48 hours", () => {
      expect(getTwapDurationText({ hours: 48, minutes: 0 })).toBe("48 hours");
    });

    it("should return '56 hours and 14 minutes' for 54 hours and 134 minutes", () => {
      expect(getTwapDurationText({ hours: 54, minutes: 134 })).toBe("56 hours and 14 minutes");
    });
  });
});
