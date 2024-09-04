import { describe, expect, it } from "vitest";
import { TokenData } from "../tokens";
import { getMaxUsdCapUsdInGmGlvMarket } from "./glv";
import { GlvMarket } from "./useGlvMarkets";

describe("glv utils", () => {
  it("getMaxUsdCapUsdInGmGlvMarket", () => {
    const minByTokens = getMaxUsdCapUsdInGmGlvMarket(
      {
        maxMarketTokenBalanceUsd: 100n,
        glvMaxMarketTokenBalanceAmount: 50n,
      } as GlvMarket,
      {
        decimals: 1,
        prices: {
          maxPrice: 2n,
          minPrice: 2n,
        },
      } as TokenData
    );

    expect(minByTokens).toBe(10n);
    const minByUsd = getMaxUsdCapUsdInGmGlvMarket(
      {
        maxMarketTokenBalanceUsd: 20n,
        glvMaxMarketTokenBalanceAmount: 200n,
      } as GlvMarket,
      {
        decimals: 1,
        prices: {
          maxPrice: 2n,
          minPrice: 1n,
        },
      } as TokenData
    );

    expect(minByUsd).toBe(20n);
  });
});
