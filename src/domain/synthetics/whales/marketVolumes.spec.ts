import { describe, expect, it } from "vitest";

import { parseMarketVolumes } from "./marketVolumes";

describe("parseMarketVolumes", () => {
  it("maps market address to bigint volume, preserving address casing", () => {
    const result = parseMarketVolumes([
      { market: "0xAbC", volume: "1000" },
      { market: "0xDeF", volume: "2500" },
    ]);
    expect(result).toEqual({ "0xAbC": 1000n, "0xDeF": 2500n });
  });

  it("returns an empty object for no rows", () => {
    expect(parseMarketVolumes([])).toEqual({});
  });
});
