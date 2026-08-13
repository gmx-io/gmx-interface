import { describe, expect, it } from "vitest";

import { USD_DECIMALS } from "configs/factors";
import { mockMarketsInfoData, mockTokensData } from "test/mock";
import { getMarketPnl, getPositiveMarketPnl } from "utils/markets";
import type { MarketInfo } from "utils/markets/types";
import { expandDecimals } from "utils/numbers";
import { getPositionPnlUsd } from "utils/positions";

const MARKET_KEY = "ETH-ETH-USDC";

function usd(amount: number) {
  return expandDecimals(amount, USD_DECIMALS);
}

function eth(amount: number) {
  return expandDecimals(amount, 18);
}

const ETH_PRICE = usd(2000);

/**
 * Long side splits into an eth collateral bucket worth +$1,000,000 and a usdc collateral bucket worth
 * -$500,000, so net pnl is $500,000 and positive-only pnl is $1,000,000. The long pool is $1,000,000
 * with a 90% trader pnl factor, so the cap binds on the positive-only figure only.
 */
function createMarketInfo(overrides: Partial<MarketInfo> = {}): MarketInfo {
  const tokensData = mockTokensData({ ETH: { prices: { minPrice: ETH_PRICE, maxPrice: ETH_PRICE } } });

  return mockMarketsInfoData(tokensData, [MARKET_KEY], {
    [MARKET_KEY]: {
      longPoolAmount: eth(500),
      maxPnlFactorForTradersLong: expandDecimals(9, 29),

      longInterestUsd: usd(2_000_000),
      longInterestInTokens: eth(1250),

      longInterestUsdUsingLongToken: usd(1_000_000),
      longInterestInTokensUsingLongToken: eth(1000),
      longInterestUsdUsingShortToken: usd(1_000_000),
      longInterestInTokensUsingShortToken: eth(250),

      ...overrides,
    },
  })[MARKET_KEY];
}

function getLongPositionPnl(marketInfo: MarketInfo) {
  return getPositionPnlUsd({
    marketInfo,
    sizeInUsd: usd(100_000),
    sizeInTokens: eth(100),
    markPrice: ETH_PRICE,
    isLong: true,
  });
}

describe("per-position pnl cap (v2.2c parity)", () => {
  it("caps against the positive-only pool pnl", () => {
    const marketInfo = createMarketInfo();

    expect(getPositiveMarketPnl(marketInfo, true, true)).toBe(usd(1_000_000));

    expect(getLongPositionPnl(marketInfo)).toBe(usd(90_000));
  });

  it("leaves the net pool pnl used by gm pool value untouched", () => {
    const marketInfo = createMarketInfo();

    expect(getMarketPnl(marketInfo, true, true)).toBe(usd(500_000));
  });

  it("keeps the net behaviour when the data source has no per-collateral open interest", () => {
    const marketInfo = createMarketInfo({
      longInterestUsdUsingLongToken: undefined,
      longInterestInTokensUsingLongToken: undefined,
      longInterestUsdUsingShortToken: undefined,
      longInterestInTokensUsingShortToken: undefined,
    });

    expect(getPositiveMarketPnl(marketInfo, true, true)).toBe(usd(500_000));
    expect(getLongPositionPnl(marketInfo)).toBe(usd(100_000));
  });

  it("matches the net pool pnl when both collateral buckets are winning", () => {
    const marketInfo = createMarketInfo({
      longInterestUsdUsingShortToken: usd(1_000_000),
      longInterestInTokensUsingShortToken: eth(600),
      longInterestUsd: usd(2_000_000),
      longInterestInTokens: eth(1600),
    });

    expect(getPositiveMarketPnl(marketInfo, true, true)).toBe(usd(1_200_000));
    expect(getMarketPnl(marketInfo, true, true)).toBe(usd(1_200_000));
    expect(getLongPositionPnl(marketInfo)).toBe(usd(75_000));
  });
});
