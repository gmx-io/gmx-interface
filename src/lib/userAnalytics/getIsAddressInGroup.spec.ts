import { describe, expect, it } from "vitest";

import { getIsAddressInGroup } from "./getIsAddressInGroup";

describe("getIsAddressInGroup", () => {
  it("it should be roughly in expected probability", () => {
    const prefferedProbabilities = [0.01, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    for (const probability of prefferedProbabilities) {
      const count = 50_000;
      let positiveCount = 0;
      for (let i = 0; i < count; i++) {
        const isInGroup = getIsAddressInGroup({
          address: i.toString(),
          experimentGroupProbability: probability,
          grouping: "test",
        });
        if (isInGroup) {
          positiveCount++;
        }
      }

      expect(positiveCount / count).toBeCloseTo(probability);
    }
  });
});
