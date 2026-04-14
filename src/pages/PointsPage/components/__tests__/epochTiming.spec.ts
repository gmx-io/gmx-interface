import { describe, expect, it } from "vitest";

import { getCurrentEpochEndTime } from "../epochTiming";

describe("getCurrentEpochEndTime", () => {
  it("uses epochStartTimestamp when present", () => {
    expect(
      getCurrentEpochEndTime(
        {
          epochDuration: 100,
          epochStartTimestamp: 1000,
          epochTimestamp: 1090,
        },
        1050
      )
    ).toBe(1100);
  });

  it("rolls the epoch window forward after rollover", () => {
    expect(
      getCurrentEpochEndTime(
        {
          epochDuration: 100,
          epochStartTimestamp: 1000,
          epochTimestamp: 1090,
        },
        1100
      )
    ).toBe(1200);
  });
});
