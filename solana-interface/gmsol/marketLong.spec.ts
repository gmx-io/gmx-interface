import { describe, expect, it } from "vitest";

import { validateSolanaMarketLongConfig } from "./config";

describe("Solana market long configuration", () => {
  it("accepts valid public keys", () => {
    expect(
      validateSolanaMarketLongConfig({
        store: "11111111111111111111111111111111",
        marketToken: "11111111111111111111111111111111",
        collateralToken: "11111111111111111111111111111111",
        longToken: "11111111111111111111111111111111",
        shortToken: "11111111111111111111111111111111",
      }).store
    ).toBe("11111111111111111111111111111111");
  });
});
