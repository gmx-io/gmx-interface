import { describe, expect, it } from "vitest";

import { getIsAddressInGroup } from "./getIsAddressInGroup";

describe("getIsAddressInGroup", () => {
  it("it should be roughly in expected probability", () => {
    const prefferedProbabilities = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    for (const probability of prefferedProbabilities) {
      const count = 50_000;
      let yesses = 0;
      for (let i = 0; i < count; i++) {
        const isInGroup = getIsAddressInGroup({
          address: i.toString(),
          experimentGroupProbability: BigInt(probability),
          grouping: "test",
        });
        if (isInGroup) {
          yesses++;
        }
      }

      expect(yesses / count).toBeCloseTo(probability / 100);
    }
  });
});
