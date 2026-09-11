import { describe, expect, it } from "vitest";

import { getAuditEpochCount } from "../utils";

describe("getAuditEpochCount", () => {
  it("returns the number of configured epochs", () => {
    expect(
      getAuditEpochCount({
        epochTimestamp: 300,
        programStartTimestamp: 100,
        epochDuration: 100,
      })
    ).toBe(3);
  });

  it("caps malformed or unexpectedly large ranges", () => {
    expect(
      getAuditEpochCount({
        epochTimestamp: 1_000_000_000,
        programStartTimestamp: 1,
        epochDuration: 1,
      })
    ).toBe(1_000);
  });

  it.each([
    { epochTimestamp: Number.POSITIVE_INFINITY, programStartTimestamp: 100, epochDuration: 100 },
    { epochTimestamp: 300, programStartTimestamp: -1, epochDuration: 100 },
    { epochTimestamp: 300, programStartTimestamp: 400, epochDuration: 100 },
    { epochTimestamp: 300, programStartTimestamp: 100, epochDuration: 0 },
  ])("rejects invalid epoch timing %#", (timing) => {
    expect(getAuditEpochCount(timing)).toBe(0);
  });
});
