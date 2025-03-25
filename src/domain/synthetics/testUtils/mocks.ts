import { expect } from "vitest";

import { AVALANCHE } from "config/chains";
import { MarketInfo, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { convertToTokenAmount } from "domain/synthetics/tokens/utils";
import { getTokenBySymbol } from "sdk/configs/tokens";
import type { PositionInfo } from "sdk/types/positions";
import { bigMath } from "sdk/utils/bigmath";
import { getLeverage } from "sdk/utils/positions";

import { getPositionKey } from "../positions";
import { ExternalSwapAggregator, ExternalSwapQuote, getMarkPrice } from "../trade";

export function mockPositionInfo(
  {
    marketInfo,
    collateralTokenAddress,
    account,
    isLong,
    sizeInUsd,
    collateralUsd,
  }: {
    marketInfo: MarketInfo;
    collateralTokenAddress: string;
    account: string;
    sizeInUsd: bigint;
    collateralUsd: bigint;
    isLong: boolean;
  },
  overrides: Partial<PositionInfo> = {}
): PositionInfo {
  const collateralToken =
    collateralTokenAddress === marketInfo.longToken.address ? marketInfo.longToken : marketInfo.shortToken;

  const collateralAmount = convertToTokenAmount(
    collateralUsd,
    collateralToken.decimals,
    collateralToken.prices?.minPrice
  )!;

  const posiionKey = getPositionKey(account, marketInfo.marketTokenAddress, collateralTokenAddress, isLong);

  return {
    data: "",
    key: posiionKey,
    contractKey: posiionKey + "contractKey",
    account: account,
    marketAddress: marketInfo.marketTokenAddress,
    collateralTokenAddress,
    sizeInUsd,
    sizeInTokens: convertToTokenAmount(
      sizeInUsd,
      marketInfo.indexToken.decimals,
      marketInfo.indexToken.prices?.minPrice
    )!,
    collateralAmount: convertToTokenAmount(collateralUsd, collateralToken.decimals, collateralToken.prices?.minPrice)!,
    increasedAtTime: BigInt((Date.now() / 1000) >> 0),
    decreasedAtTime: BigInt((Date.now() / 1000) >> 0),
    isLong: true,
    pendingBorrowingFeesUsd: 0n,
    fundingFeeAmount: 0n,
    claimableLongTokenAmount: 0n,
    claimableShortTokenAmount: 0n,
    marketInfo,
    market: marketInfo,
    longToken: marketInfo.longToken,
    shortToken: marketInfo.shortToken,
    indexName: getMarketIndexName(marketInfo),
    poolName: getMarketPoolName(marketInfo),
    indexToken: marketInfo.indexToken,
    collateralToken,
    pnlToken: marketInfo.longToken,
    markPrice: getMarkPrice({ prices: marketInfo.indexToken.prices, isIncrease: false, isLong }),
    entryPrice: getMarkPrice({ prices: marketInfo.indexToken.prices, isIncrease: false, isLong }),
    liquidationPrice: getMarkPrice({ prices: marketInfo.indexToken.prices, isIncrease: false, isLong }),
    collateralUsd,
    remainingCollateralUsd: collateralUsd,
    remainingCollateralAmount: collateralAmount,
    hasLowCollateral: false,
    leverage: getLeverage({
      sizeInUsd,
      collateralUsd,
      pnl: 0n,
      pendingFundingFeesUsd: 0n,
      pendingBorrowingFeesUsd: 0n,
    }),
    leverageWithPnl: 0n,
    pnl: 0n,
    pnlPercentage: 0n,
    pnlAfterFees: 0n,
    pnlAfterFeesPercentage: 0n,
    netValue: 0n,
    closingFeeUsd: 0n,
    uiFeeUsd: 0n,
    pendingFundingFeesUsd: 0n,
    pendingClaimableFundingFeesUsd: 0n,
    positionFeeAmount: 0n,
    traderDiscountAmount: 0n,
    uiFeeAmount: 0n,
    ...overrides,
  };
}

export const MOCK_TXN_DATA = {
  to: "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64",
  data: "0xabcd",
  value: 0n,
  estimatedGas: 100000n,
};

export function mockExternalSwapQuote(overrides: Partial<ExternalSwapQuote> = {}): ExternalSwapQuote {
  return {
    aggregator: ExternalSwapAggregator.OpenOcean,
    inTokenAddress: getTokenBySymbol(AVALANCHE, "BTC").address,
    outTokenAddress: getTokenBySymbol(AVALANCHE, "USDC").address,
    amountIn: 1000000n,
    amountOut: 900000n,
    usdIn: 1000000n,
    usdOut: 900000n,
    priceIn: 1000000n,
    priceOut: 900000n,
    feesUsd: 100000n,
    needSpenderApproval: false,
    txnData: MOCK_TXN_DATA,
    ...overrides,
  };
}

export function expectEqualWithPrecision(
  expected: bigint,
  actual: bigint,
  precision = 1_000_000n // min significant diff is 0.0000001% of expected value
) {
  const diff = bigMath.abs(actual - expected);

  if (diff === 0n) {
    return;
  }

  const diffPrecision = (diff * (precision * 1000n)) / expected;

  expect(diffPrecision).toBeLessThanOrEqual(1n);
}
