import { describe, expect, it } from "vitest";

import type { TokenData } from "domain/synthetics/tokens";
import { expandDecimals } from "lib/numbers";
import { mockMarketsInfoData, mockTokensData } from "sdk/test/mock";
import type { FindSwapPath, SwapPathStats } from "sdk/utils/trade/types";

import { getDepositAmounts } from "../../trade/utils/deposit";

const USD = expandDecimals(1, 30);
const tokensData = mockTokensData();
const collateralToken = tokensData.DAI;
const initialShortToken = tokensData.USDC;
const marketInfo = mockMarketsInfoData(tokensData, ["ETH-DAI-DAI"])["ETH-DAI-DAI"];

const marketToken = {
  decimals: 18,
  totalSupply: expandDecimals(2000, 18),
  prices: { minPrice: USD, maxPrice: USD },
} as TokenData;

const findSwapPath: FindSwapPath = (usdIn) =>
  ({
    swapPath: ["0xpool"],
    swapSteps: [{ amountIn: usdIn / expandDecimals(1, 30 - initialShortToken.decimals) }],
    usdOut: usdIn,
    amountOut: usdIn / expandDecimals(1, 30 - collateralToken.decimals),
    totalFeesDeltaUsd: 0n,
    tokenInAddress: initialShortToken.address,
    tokenOutAddress: collateralToken.address,
  }) as unknown as SwapPathStats;

function getAmounts(p: { strategy: "byCollaterals" | "byMarketToken"; findSwapPath?: FindSwapPath }) {
  return getDepositAmounts({
    marketInfo,
    marketToken,
    longToken: collateralToken,
    shortToken: collateralToken,
    longTokenAmount: 0n,
    shortTokenAmount: 0n,
    marketTokenAmount: expandDecimals(10, 18),
    strategy: p.strategy,
    includeLongToken: false,
    includeShortToken: true,
    uiFeeFactor: 0n,
    isMarketTokenDeposit: false,
    initialShortToken,
    initialShortTokenAmount: expandDecimals(10, initialShortToken.decimals),
    findSwapPath: p.findSwapPath,
  });
}

describe("getDepositAmounts with an initial short token", () => {
  it("swaps the paid token into the short token by collaterals", () => {
    const amounts = getAmounts({ strategy: "byCollaterals", findSwapPath });

    expect(amounts.shortTokenSwapPathStats?.usdOut).toBe(10n * USD);
    expect(amounts.initialShortTokenAmount).toBe(expandDecimals(10, initialShortToken.decimals));
    expect(amounts.shortTokenAmount).toBe(expandDecimals(10, collateralToken.decimals));
    expect(amounts.longTokenAmount).toBe(0n);
    expect(amounts.marketTokenAmount > 0n).toBe(true);
  });

  it("does not swap without a route", () => {
    const amounts = getAmounts({ strategy: "byCollaterals", findSwapPath: () => undefined });

    expect(amounts.shortTokenSwapPathStats).toBeUndefined();
    expect(amounts.initialShortTokenAmount).toBeUndefined();
    expect(amounts.shortTokenAmount).toBe(0n);
  });

  it("routes the needed short token by market token", () => {
    const amounts = getAmounts({ strategy: "byMarketToken", findSwapPath });

    expect(amounts.shortTokenSwapPathStats?.usdOut).toBe(amounts.shortTokenUsd);
    expect(amounts.initialShortTokenAmount).toBe(amounts.shortTokenSwapPathStats?.swapSteps[0].amountIn);
    expect(amounts.longTokenUsd).toBe(0n);
  });
});
