import { ethers } from "ethers";
import { describe, expect, it } from "vitest";

import { applyImpactFactor } from "domain/synthetics/fees";
import { expandDecimals } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

describe("applyImpactFactor", () => {
  for (const [diffUsd, exponentFactor, impactFactor, expected] of [
    [10000, 3, "0.000000000001", "999999999999999971996569854874"],
    [100000, 3, "0.000000000001", "999999999999999972158527355760923"],
    [1000000, 3, "0.000000000001", "999999999999999974481076694795741150"],
    [10000000, 3, "0.000000000001", "999999999999999977004203243086721668335"],
    [1000000000, 3, "0.000000000001", "999999999999999964992485098699963454527292263"],
    [1000000000, 3, "1", "999999999999999964992485098699963454527292263000000000000"],

    [10000, 2, "0.00000001", "999999999999999981235216490000"],
    [100000, 2, "0.00000001", "99999999999999998147004678330000"],
    [1000000, 2, "0.00000001", "9999999999999999830554320142260000"],
    [10000000, 2, "0.00000001", "999999999999999984577907497082540000"],

    [10000, "1.75", "0.0000001", "999999999999999983993282600000"],
    [100000, "1.75", "0.0000001", "56234132519034907150467965500000"],
    [1000000, "1.75", "0.0000001", "3162277660168379284617577705300000"],
    [10000000, "1.75", "0.0000001", "177827941003892277732818564790100000"],

    // and for small values
    ["0.0000000000001", "1.5", "0.000001", 0],
    ["0.001", "1.5", "0.000001", 0],
    [1, "1.5", "0.000001", "1000000000000000000000000"],
    [1000, "1.5", "0.000001", "31622776601683792872691000000"],
    [10000, "1.5", "0.000001", "999999999999999985875227000000"],
    [100000, "1.5", "0.000001", "31622776601683792881032921000000"],
    [1000000, "1.5", "0.000001", "999999999999999987642846054000000"],
    [10000000, "1.5", "0.000001", "31622776601683792957603597100000000"],

    [10000, "1", "0.0001", "1000000000000000000000000000000"],
    [100000, "1", "0.0001", "10000000000000000000000000000000"],
    [1000000, "1", "0.0001", "100000000000000000000000000000000"],
    [10000000, "1", "0.0001", "1000000000000000000000000000000000"],
  ]) {
    it(`should keep difference >1/1e10 from the contract value: ${expected}`, () => {
      const result = applyImpactFactor(
        ethers.parseUnits(String(diffUsd), 30),
        ethers.parseUnits(String(impactFactor), 30),
        ethers.parseUnits(String(exponentFactor), 30)
      );

      const _expected = BigInt(expected);

      expect(
        _expected == 0n
          ? result < expandDecimals(1, 20)
          : _expected / bigMath.abs(_expected - result!) > expandDecimals(1, 10)
      ).toBe(true);
    });
  }
});
