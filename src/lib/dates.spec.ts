import { describe, expect, it } from "vitest";
import { secondsToHumanReadableDuration } from "./dates";

describe("secondsToHumanReadableDuration", () => {
  it("should return correct duration", () => {
    expect(secondsToHumanReadableDuration(30n)).toBe("Every 30 seconds");
    expect(secondsToHumanReadableDuration(60n)).toBe("Every 1 minute");
    expect(secondsToHumanReadableDuration(90n)).toBe("Every 1 minute 30 seconds");
    expect(secondsToHumanReadableDuration(3600n)).toBe("Every 1 hour");
    expect(secondsToHumanReadableDuration(3690n)).toBe("Every 1 hour 1 minute 30 seconds");
    expect(secondsToHumanReadableDuration(86400n)).toBe("Every 1 day");
    expect(secondsToHumanReadableDuration(604800n)).toBe("Every 1 week");
  });

  it("should correct roundUp", () => {
    expect(secondsToHumanReadableDuration(90n, "minutes")).toBe("Every 1 minute");
    expect(secondsToHumanReadableDuration(3690n, "minutes")).toBe("Every 1 hour 1 minute");
    expect(secondsToHumanReadableDuration(3690n, "hours")).toBe("Every 1 hour");
    expect(secondsToHumanReadableDuration(87400n, "days")).toBe("Every 1 day");
    expect(secondsToHumanReadableDuration(654800n, "weeks")).toBe("Every 1 week");
  });
});
