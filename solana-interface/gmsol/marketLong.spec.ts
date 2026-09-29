import { describe, expect, it } from "vitest";

import { validateSolanaMarketLongConfig } from "./config";
import { calculateSolanaMarketLongSizeDeltaUsd } from "./marketLong";

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

  it("calculates size delta with Solana's 20-decimal USD precision", () => {
    expect(calculateSolanaMarketLongSizeDeltaUsd(1_000_000n, 25_000n)).toBe(
      250_000_000_000_000n
    );
  });
});
