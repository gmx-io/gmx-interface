import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import type { selectUserReferralInfo } from "context/SyntheticsStateContext/selectors/globalSelectors";
import type { ExecutionFee } from "domain/synthetics/fees";
import type { MarketInfo } from "domain/synthetics/markets";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import type { PositionOrderInfo } from "domain/synthetics/orders";
import type { PositionInfo, PositionInfoLoaded } from "domain/synthetics/positions";
import { getPendingMockPosition } from "domain/synthetics/positions/usePositions";
import { convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import type { TokenData } from "domain/synthetics/tokens";
import { getDecreasePositionAmounts } from "domain/synthetics/trade";
import type { DecreasePositionAmounts } from "domain/synthetics/trade";
import { buildDecreaseOrderPayload } from "sdk/utils/orderTransactions";

export type NextPositionValues =
  | {
      nextEntryPrice?: bigint;
      nextLiqPrice?: bigint;
      nextLeverage?: bigint;
      leverageWithPnl?: bigint;
      leverageWithoutPnl?: bigint;
    }
  | undefined;

export function calculateTotalSizeUsd(p: {
  existingPositionSizeUsd: bigint | undefined;
  isLimitOrStopIncrease: boolean;
  order: PositionOrderInfo | undefined;
  sizeDeltaUsd: bigint;
}) {
  if (!p.isLimitOrStopIncrease || !p.order) {
    return 0n;
  }

  return (p.existingPositionSizeUsd ?? 0n) + p.sizeDeltaUsd;
}

export function calculateTotalSizeInTokens(p: {
  baseSizeInTokens: bigint | undefined;
  increaseSizeDeltaInTokens: bigint | undefined;
  isLimitOrStopIncrease: boolean;
  order: PositionOrderInfo | undefined;
  positionIndexToken: TokenData | undefined;
  sizeDeltaUsd: bigint;
  triggerPrice: bigint | undefined;
}) {
  if (!p.isLimitOrStopIncrease || !p.order) {
    return 0n;
  }

  const baseSizeInTokens = p.baseSizeInTokens ?? 0n;

  if (p.increaseSizeDeltaInTokens !== undefined) {
    return baseSizeInTokens + p.increaseSizeDeltaInTokens;
  }

  if (!p.positionIndexToken || p.triggerPrice === undefined || p.sizeDeltaUsd === 0n) {
    return baseSizeInTokens;
  }

  const orderSizeInTokens = convertToTokenAmount(p.sizeDeltaUsd, p.positionIndexToken.decimals, p.triggerPrice) ?? 0n;

  return baseSizeInTokens + orderSizeInTokens;
}

export function getCollateralDeltaAmount(p: {
  collateralDeltaAmount: bigint | undefined;
  isLimitOrStopIncrease: boolean;
  order: PositionOrderInfo | undefined;
}) {
  if (!p.isLimitOrStopIncrease || !p.order) {
    return 0n;
  }

  if (p.collateralDeltaAmount !== undefined) {
    return p.collateralDeltaAmount;
  }

  return p.order.initialCollateralDeltaAmount ?? 0n;
}

export function getCollateralDeltaUsd(p: {
  collateralDeltaAmount: bigint;
  collateralDeltaUsd: bigint | undefined;
  isLimitOrStopIncrease: boolean;
  order: PositionOrderInfo | undefined;
}) {
  if (!p.isLimitOrStopIncrease || !p.order) {
    return 0n;
  }

  if (p.collateralDeltaUsd !== undefined) {
    return p.collateralDeltaUsd;
  }

  return (
    convertToUsd(
      p.collateralDeltaAmount,
      p.order.targetCollateralToken.decimals,
      p.order.targetCollateralToken.prices.minPrice
    ) ?? 0n
  );
}

export function buildPositionInfoLoaded(p: {
  existingPosition: PositionInfo | undefined;
  isLimitOrStopIncrease: boolean;
  markPrice: bigint | undefined;
  market: MarketInfo | undefined;
  nextPositionValuesForIncrease: NextPositionValues;
  order: PositionOrderInfo | undefined;
  positionKey: string | undefined;
  totalCollateralAmountForTpSl: bigint;
  totalCollateralUsdForTpSl: bigint;
  totalSizeInTokensForTpSl: bigint;
  totalSizeUsdForTpSl: bigint;
  triggerPrice: bigint | undefined;
}): PositionInfoLoaded | undefined {
  if (
    !p.isLimitOrStopIncrease ||
    !p.market ||
    !p.order ||
    !p.positionKey ||
    p.totalSizeUsdForTpSl <= 0n ||
    p.totalSizeInTokensForTpSl <= 0n
  ) {
    return undefined;
  }

  const pending = getPendingMockPosition({
    isIncrease: true,
    positionKey: p.positionKey,
    sizeDeltaUsd: p.totalSizeUsdForTpSl,
    sizeDeltaInTokens: p.totalSizeInTokensForTpSl,
    collateralDeltaAmount: p.totalCollateralAmountForTpSl,
    updatedAt: Date.now(),
    updatedAtBlock: 0n,
  });

  const nextEntryPrice =
    p.nextPositionValuesForIncrease?.nextEntryPrice ??
    p.existingPosition?.entryPrice ??
    p.triggerPrice ??
    p.order.triggerPrice;

  const nextLiqPrice = p.nextPositionValuesForIncrease?.nextLiqPrice ?? p.existingPosition?.liquidationPrice;
  const baseMarkPrice = p.markPrice ?? p.existingPosition?.markPrice ?? 0n;
  const nextLeverage = p.nextPositionValuesForIncrease?.nextLeverage;

  return {
    ...pending,
    marketInfo: p.market,
    market: p.market,
    indexToken: p.market.indexToken,
    indexName: getMarketIndexName(p.market),
    poolName: getMarketPoolName(p.market),
    longToken: p.market.longToken,
    shortToken: p.market.shortToken,
    collateralToken: p.order.targetCollateralToken,
    pnlToken: p.order.isLong ? p.market.longToken : p.market.shortToken,
    markPrice: baseMarkPrice,
    entryPrice: nextEntryPrice,
    liquidationPrice: nextLiqPrice,
    collateralUsd: p.totalCollateralUsdForTpSl,
    remainingCollateralUsd: p.totalCollateralUsdForTpSl,
    remainingCollateralAmount: p.totalCollateralAmountForTpSl,
    netValue: p.totalCollateralUsdForTpSl,
    hasLowCollateral: false,
    leverage: nextLeverage ?? p.existingPosition?.leverage,
    leverageWithPnl: nextLeverage ?? p.existingPosition?.leverageWithPnl,
    leverageWithoutPnl: nextLeverage ?? p.existingPosition?.leverageWithoutPnl,
    pnl: 0n,
    pnlPercentage: 0n,
    pnlAfterFees: 0n,
    pnlAfterFeesPercentage: 0n,
    closingFeeUsd: 0n,
    uiFeeUsd: 0n,
    pendingFundingFeesUsd: p.existingPosition?.pendingFundingFeesUsd ?? 0n,
    pendingBorrowingFeesUsd: p.existingPosition?.pendingBorrowingFeesUsd ?? 0n,
    pendingClaimableFundingFeesUsd: p.existingPosition?.pendingClaimableFundingFeesUsd ?? 0n,
    pendingImpactAmount: p.existingPosition?.pendingImpactAmount ?? 0n,
    positionFeeAmount: p.existingPosition?.positionFeeAmount ?? 0n,
    netPriceImapctDeltaUsd: p.existingPosition?.netPriceImapctDeltaUsd ?? 0n,
    priceImpactDiffUsd: p.existingPosition?.priceImpactDiffUsd ?? 0n,
    traderDiscountAmount: p.existingPosition?.traderDiscountAmount ?? 0n,
    uiFeeAmount: p.existingPosition?.uiFeeAmount ?? 0n,
    pendingImpactUsd: p.existingPosition?.pendingImpactUsd ?? 0n,
    closePriceImpactDeltaUsd: p.existingPosition?.closePriceImpactDeltaUsd ?? 0n,
  };
}

export function getDecreaseAmountsForEntry(p: {
  isSetAcceptablePriceImpactEnabled: boolean;
  isTpSlEnabled: boolean;
  minCollateralUsd: bigint | undefined;
  minPositionSizeUsd: bigint | undefined;
  order: PositionOrderInfo | undefined;
  positionForTpSl: PositionInfoLoaded | undefined;
  price: bigint | null | undefined;
  triggerOrderType: OrderType.LimitDecrease | OrderType.StopLossDecrease;
  triggerPrice: bigint | undefined;
  uiFeeFactor: bigint;
  userReferralInfo: ReturnType<typeof selectUserReferralInfo> | undefined;
}): DecreasePositionAmounts | undefined {
  if (
    !p.isTpSlEnabled ||
    !p.positionForTpSl ||
    !p.order ||
    typeof p.price !== "bigint" ||
    p.minCollateralUsd === undefined ||
    p.minPositionSizeUsd === undefined
  ) {
    return undefined;
  }

  return getDecreasePositionAmounts({
    marketInfo: p.positionForTpSl.marketInfo,
    collateralToken: p.order.targetCollateralToken,
    isLong: p.order.isLong,
    position: p.positionForTpSl,
    closeSizeUsd: p.positionForTpSl.sizeInUsd,
    keepLeverage: true,
    triggerPrice: p.price,
    userReferralInfo: p.userReferralInfo,
    minCollateralUsd: p.minCollateralUsd,
    minPositionSizeUsd: p.minPositionSizeUsd,
    uiFeeFactor: p.uiFeeFactor,
    isLimit: true,
    limitPrice: p.triggerPrice ?? p.order.triggerPrice,
    triggerOrderType: p.triggerOrderType,
    isSetAcceptablePriceImpactEnabled: p.isSetAcceptablePriceImpactEnabled,
  });
}

export type TpSlPayloadEntry = {
  amounts?: DecreasePositionAmounts;
  executionFee?: Pick<ExecutionFee, "feeToken" | "feeTokenAmount" | "feeUsd">;
};

export function buildTpSlCreatePayloads(p: {
  autoCancelOrdersLimit: number;
  chainId: number;
  isTpSlEnabled: boolean;
  order: PositionOrderInfo | undefined;
  entries: TpSlPayloadEntry[];
  userReferralCode: string | undefined;
}) {
  if (!p.isTpSlEnabled || !p.order) {
    return [];
  }

  const order = p.order;

  const validEntries = p.entries.filter((item) => item.amounts);

  return validEntries.map((item, i) =>
    buildDecreaseOrderPayload({
      chainId: p.chainId as any,
      receiver: order.account,
      collateralDeltaAmount: item.amounts?.collateralDeltaAmount ?? 0n,
      collateralTokenAddress: order.targetCollateralToken.address,
      sizeDeltaUsd: item.amounts?.sizeDeltaUsd ?? 0n,
      sizeDeltaInTokens: item.amounts?.sizeDeltaInTokens ?? 0n,
      referralCode: p.userReferralCode,
      uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT,
      allowedSlippage: 0,
      orderType: item.amounts?.triggerOrderType ?? OrderType.LimitDecrease,
      autoCancel: i < p.autoCancelOrdersLimit,
      swapPath: [],
      externalSwapQuote: undefined,
      marketAddress: order.marketInfo.marketTokenAddress,
      indexTokenAddress: order.indexToken.address,
      isLong: order.isLong,
      acceptablePrice: item.amounts?.acceptablePrice ?? 0n,
      triggerPrice: item.amounts?.triggerPrice ?? 0n,
      receiveTokenAddress: order.targetCollateralToken.address,
      minOutputUsd: 0n,
      decreasePositionSwapType: item.amounts?.decreaseSwapType ?? DecreasePositionSwapType.NoSwap,
      executionFeeAmount: item.executionFee?.feeTokenAmount ?? 0n,
      executionGasLimit: 0n,
      validFromTime: 0n,
    })
  );
}
