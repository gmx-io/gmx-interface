import { describe, expect, it } from "vitest";

import { getTokenAddressesSortedByPoolValue } from "../tokenSorting";

describe("getTokenAddressesSortedByPoolValue", () => {
  it("sorts tokens by their total pool value across long and short sides", () => {
    expect(
      getTokenAddressesSortedByPoolValue([
        { tokenAddress: "USDC", poolValueUsd: 60n },
        { tokenAddress: "ETH", poolValueUsd: 80n },
        { tokenAddress: "BTC", poolValueUsd: 70n },
        { tokenAddress: "USDC", poolValueUsd: 50n },
        { tokenAddress: "SOL", poolValueUsd: 60n },
        { tokenAddress: "LINK", poolValueUsd: 50n },
      ])
    ).toEqual(["USDC", "ETH", "BTC", "SOL", "LINK"]);
  });
});
