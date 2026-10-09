import { describe, expect, it } from "vitest";

import { getCallsCountBucket } from "./utils";

describe("getCallsCountBucket", () => {
  it("puts a call count into the bucket with the nearest inclusive upper bound", () => {
    const cases: [callsCount: number, bucket: string][] = [
      [1, "1"],
      [2, "2-10"],
      [10, "2-10"],
      [11, "11-50"],
      [500, "201-500"],
      [501, "501-1000"],
      [5000, "2001-5000"],
      [5001, ">5000"],
      [11630, ">5000"],
    ];

    expect(cases.map(([callsCount]) => getCallsCountBucket(callsCount))).toEqual(cases.map(([, bucket]) => bucket));
  });
});
