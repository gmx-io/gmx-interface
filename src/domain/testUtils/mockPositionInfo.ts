import type { PositionInfo } from "domain/synthetics/positions/types";
import { expandDecimals } from "lib/numbers";
import { hashedPositionKey } from "sdk/configs/dataStore";
import type { MarketInfo } from "sdk/utils/markets/types";
import { getPositionKey } from "sdk/utils/positions";
import { getMarkPrice } from "sdk/utils/prices/utils";
import type { TokenData } from "sdk/utils/tokens/types";
import { convertToTokenAmount } from "sdk/utils/tokens/utils";

import { createMockMarketInfo, createMockMarketsData } from "./mockMarketInfo";
import { USDC_TOKEN } from "./mockTokens";

export type MockPositionInfoOverrides = {
  account: string;
  marketInfo?: MarketInfo;
  collateralToken?: TokenData;
  isLong?: boolean;
  sizeInUsd?: bigint;
  sizeInTokens?: bigint;
  collateralAmount?: bigint;
  collateralUsd?: bigint;
  liquidationPrice?: bigint;
};

/**
 * A clean 2x ETH/USD long by default: 1 ETH at $2000 entry, 1000 USDC collateral,
 * zero pending fees/pnl. The key matches selectTradeboxSelectedPositionKey.
 */
export function createMockPositionInfo({
  account,
  marketInfo = createMockMarketInfo(),
  collateralToken = USDC_TOKEN,
  isLong = true,
  sizeInUsd = expandDecimals(2000, 30),
  sizeInTokens = expandDecimals(1, 18),
  collateralAmount,
  collateralUsd = expandDecimals(1000, 30),
  liquidationPrice,
}: MockPositionInfoOverrides): PositionInfo {
  const resolvedCollateralAmount =
    collateralAmount ?? convertToTokenAmount(collateralUsd, collateralToken.decimals, collateralToken.prices.minPrice);

  if (resolvedCollateralAmount === undefined) {
    throw new Error("Unable to derive mock position collateral amount");
  }

  const key = getPositionKey(account, marketInfo.marketTokenAddress, collateralToken.address, isLong);
  const markPrice = getMarkPrice({ prices: marketInfo.indexToken.prices, isIncrease: false, isLong });
  const entryPrice =
    sizeInTokens > 0n ? (sizeInUsd * 10n ** BigInt(marketInfo.indexToken.decimals)) / sizeInTokens : 0n;
  const leverage = collateralUsd > 0n ? (sizeInUsd * 10000n) / collateralUsd : undefined;

  return {
    key,
    contractKey: hashedPositionKey(account, marketInfo.marketTokenAddress, collateralToken.address, isLong),
    account,
    marketAddress: marketInfo.marketTokenAddress,
    collateralTokenAddress: collateralToken.address,
    sizeInUsd,
    sizeInTokens,
    collateralAmount: resolvedCollateralAmount,
    pendingBorrowingFeesUsd: 0n,
    increasedAtTime: 0n,
    decreasedAtTime: 0n,
    isLong,
    fundingFeeAmount: 0n,
    claimableLongTokenAmount: 0n,
    claimableShortTokenAmount: 0n,
    pnl: 0n,
    positionFeeAmount: 0n,
    traderDiscountAmount: 0n,
    uiFeeAmount: 0n,
    pendingImpactAmount: 0n,
    positionValueInUsd: 0n,
    data: "",

    marketInfo,
    market: createMockMarketsData([marketInfo])[marketInfo.marketTokenAddress],
    indexToken: marketInfo.indexToken,
    longToken: marketInfo.longToken,
    shortToken: marketInfo.shortToken,
    indexName: marketInfo.name,
    poolName: marketInfo.name,
    collateralToken,
    pnlToken: isLong ? marketInfo.longToken : marketInfo.shortToken,
    markPrice,
    entryPrice,
    // ~2x long liquidates around entry * 0.525, short around entry * 1.475
    liquidationPrice: liquidationPrice ?? (isLong ? (entryPrice * 105n) / 200n : (entryPrice * 295n) / 200n),
    collateralUsd,
    remainingCollateralUsd: collateralUsd,
    remainingCollateralAmount: resolvedCollateralAmount,
    hasLowCollateral: false,
    pnlPercentage: 0n,
    pnlAfterFees: 0n,
    pnlAfterFeesPercentage: 0n,
    netValueAfterAllFees: collateralUsd,
    pnlAfterAllFees: 0n,
    pnlAfterAllFeesPercentage: 0n,
    netPriceImapctDeltaUsd: 0n,
    priceImpactDiffUsd: 0n,
    pendingImpactUsd: 0n,
    closePriceImpactDeltaUsd: 0n,
    leverage,
    leverageWithPnl: leverage,
    leverageWithoutPnl: leverage,
    netValue: collateralUsd,
    closingFeeUsd: 0n,
    uiFeeUsd: 0n,
    pendingFundingFeesUsd: 0n,
    pendingClaimableFundingFeesUsd: 0n,
  };
}
