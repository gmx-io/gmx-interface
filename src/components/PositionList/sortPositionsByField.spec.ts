import { describe, expect, it } from "vitest";

import { PositionInfo } from "domain/synthetics/positions";

import { sortPositionsByField } from "./sortPositionsByField";

function makePosition(key: string, netValue: bigint, netValueAfterAllFees: bigint): PositionInfo {
  return { key, netValue, netValueAfterAllFees } as unknown as PositionInfo;
}

describe("sortPositionsByField — netValue", () => {
  const a = makePosition("a", 300n, 100n);
  const b = makePosition("b", 100n, 200n);

  it("sorts by netValue when showPnlAfterFees is false", () => {
    const result = sortPositionsByField([a, b], "netValue", "asc", false);
    expect(result.map((p) => p.key)).toEqual(["b", "a"]);
  });

  it("sorts by netValueAfterAllFees when showPnlAfterFees is true", () => {
    const result = sortPositionsByField([a, b], "netValue", "asc", true);
    expect(result.map((p) => p.key)).toEqual(["a", "b"]);
  });

  it("descending direction reverses the order in both modes", () => {
    expect(sortPositionsByField([a, b], "netValue", "desc", false).map((p) => p.key)).toEqual(["a", "b"]);
    expect(sortPositionsByField([a, b], "netValue", "desc", true).map((p) => p.key)).toEqual(["b", "a"]);
  });
});
