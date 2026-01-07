import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import type { selectUserReferralInfo } from "context/SyntheticsStateContext/selectors/globalSelectors";
import type { MarketInfo } from "domain/synthetics/markets";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import type { PositionInfo, PositionInfoLoaded } from "domain/synthetics/positions";
import { getPendingMockPosition } from "domain/synthetics/positions/usePositions";
import type { TokenData } from "domain/synthetics/tokens";
import { getDecreasePositionAmounts } from "domain/synthetics/trade";
import type { DecreasePositionAmounts } from "domain/synthetics/trade";
import { buildDecreaseOrderPayload } from "sdk/utils/orderTransactions";

export type BuildTpSlPositionInfoParams = {
  positionKey?: string;
  marketInfo?: MarketInfo;
  collateralToken?: TokenData;
  isLong?: boolean;
  isIncrease: boolean;
  sizeDeltaUsd?: bigint;
  sizeDeltaInTokens?: bigint;
  collateralDeltaAmount?: bigint;
  markPrice?: bigint;
  entryPrice?: bigint;
  liquidationPrice?: bigint;
  collateralUsd?: bigint;
  remainingCollateralUsd?: bigint;
  remainingCollateralAmount?: bigint;
  netValue?: bigint;
  leverage?: bigint;
  leverageWithPnl?: bigint;
  leverageWithoutPnl?: bigint;
  existingPosition?: PositionInfo;
  includeExistingFees?: boolean;
  requirePositiveSizes?: boolean;
};

export type TpSlInputPositionData = {
  sizeInUsd: bigint;
  sizeInTokens: bigint;
  collateralUsd: bigint;
  entryPrice: bigint;
  liquidationPrice?: bigint;
  isLong: boolean;
  indexTokenDecimals: number;
  visualMultiplier?: number;
};

export function buildTpSlInputPositionData(p: {
  position?: Pick<
    PositionInfo,
    "sizeInUsd" | "sizeInTokens" | "collateralUsd" | "entryPrice" | "liquidationPrice" | "isLong"
  >;
  collateralUsd?: bigint;
  indexTokenDecimals: number;
  visualMultiplier?: number;
}): TpSlInputPositionData | undefined {
  if (!p.position) {
    return undefined;
  }

  return {
    sizeInUsd: p.position.sizeInUsd ?? 0n,
    sizeInTokens: p.position.sizeInTokens ?? 0n,
    collateralUsd: p.collateralUsd ?? p.position.collateralUsd ?? 0n,
    entryPrice: p.position.entryPrice ?? 0n,
    liquidationPrice: p.position.liquidationPrice,
    isLong: p.position.isLong,
    indexTokenDecimals: p.indexTokenDecimals,
    visualMultiplier: p.visualMultiplier,
  };
}

export function buildTpSlPositionInfo(p: BuildTpSlPositionInfoParams): PositionInfoLoaded | undefined {
  if (!p.positionKey || !p.marketInfo || !p.collateralToken) {
    return undefined;
  }

  const sizeDeltaUsd = p.sizeDeltaUsd ?? 0n;
  const sizeDeltaInTokens = p.sizeDeltaInTokens ?? 0n;
  const collateralDeltaAmount = p.collateralDeltaAmount ?? 0n;

  if (p.requirePositiveSizes && (sizeDeltaUsd <= 0n || sizeDeltaInTokens <= 0n)) {
    return undefined;
  }

  const pending = getPendingMockPosition({
    isIncrease: p.isIncrease,
    positionKey: p.positionKey,
    sizeDeltaUsd,
    sizeDeltaInTokens,
    collateralDeltaAmount,
    updatedAt: Date.now(),
    updatedAtBlock: 0n,
  });

  const indexName = getMarketIndexName(p.marketInfo);
  const poolName = getMarketPoolName(p.marketInfo);
  const feeSource = p.includeExistingFees ? p.existingPosition : undefined;
  const isLong = p.isLong ?? pending.isLong;

  const markPrice = p.markPrice ?? feeSource?.markPrice ?? 0n;
  const entryPrice = p.entryPrice ?? feeSource?.entryPrice;
  const liquidationPrice = p.liquidationPrice ?? feeSource?.liquidationPrice;

  const leverage = p.leverage ?? feeSource?.leverage;
  const leverageWithPnl = p.leverageWithPnl ?? feeSource?.leverageWithPnl ?? leverage;
  const leverageWithoutPnl = p.leverageWithoutPnl ?? feeSource?.leverageWithoutPnl ?? leverage;

  return {
    ...pending,
    marketInfo: p.marketInfo,
    market: p.marketInfo,
    indexToken: p.marketInfo.indexToken,
    indexName,
    poolName,
    longToken: p.marketInfo.longToken,
    shortToken: p.marketInfo.shortToken,
    collateralToken: p.collateralToken,
    pnlToken: isLong ? p.marketInfo.longToken : p.marketInfo.shortToken,
    markPrice,
    entryPrice,
    liquidationPrice,
    collateralUsd: p.collateralUsd ?? feeSource?.collateralUsd ?? 0n,
    remainingCollateralUsd: p.remainingCollateralUsd ?? feeSource?.remainingCollateralUsd ?? 0n,
    remainingCollateralAmount: p.remainingCollateralAmount ?? feeSource?.remainingCollateralAmount ?? 0n,
    netValue: p.netValue ?? feeSource?.netValue ?? 0n,
    hasLowCollateral: false,
    leverage,
    leverageWithPnl,
    leverageWithoutPnl,
    pnl: 0n,
    pnlPercentage: 0n,
    pnlAfterFees: 0n,
    pnlAfterFeesPercentage: 0n,
    closingFeeUsd: 0n,
    uiFeeUsd: 0n,
    pendingFundingFeesUsd: feeSource?.pendingFundingFeesUsd ?? 0n,
    pendingBorrowingFeesUsd: feeSource?.pendingBorrowingFeesUsd ?? 0n,
    pendingClaimableFundingFeesUsd: feeSource?.pendingClaimableFundingFeesUsd ?? 0n,
    pendingImpactAmount: feeSource?.pendingImpactAmount ?? 0n,
    positionFeeAmount: feeSource?.positionFeeAmount ?? 0n,
    netPriceImapctDeltaUsd: feeSource?.netPriceImapctDeltaUsd ?? 0n,
    priceImpactDiffUsd: feeSource?.priceImpactDiffUsd ?? 0n,
    traderDiscountAmount: feeSource?.traderDiscountAmount ?? 0n,
    uiFeeAmount: feeSource?.uiFeeAmount ?? 0n,
    pendingImpactUsd: feeSource?.pendingImpactUsd ?? 0n,
    closePriceImpactDeltaUsd: feeSource?.closePriceImpactDeltaUsd ?? 0n,
  };
}

export function getTpSlDecreaseAmounts(p: {
  position: PositionInfoLoaded | undefined;
  closeSizeUsd: bigint | null | undefined;
  triggerPrice: bigint | null | undefined;
  triggerOrderType: OrderType.LimitDecrease | OrderType.StopLossDecrease | undefined;
  keepLeverage?: boolean;
  isLimit: boolean;
  limitPrice: bigint | undefined;
  minCollateralUsd: bigint | undefined;
  minPositionSizeUsd: bigint | undefined;
  uiFeeFactor: bigint | undefined;
  userReferralInfo: ReturnType<typeof selectUserReferralInfo> | undefined;
  isSetAcceptablePriceImpactEnabled: boolean;
}): DecreasePositionAmounts | undefined {
  if (
    !p.position ||
    p.closeSizeUsd === undefined ||
    p.closeSizeUsd === null ||
    p.triggerPrice === undefined ||
    p.triggerPrice === null ||
    p.minCollateralUsd === undefined ||
    p.minPositionSizeUsd === undefined ||
    p.uiFeeFactor === undefined ||
    !p.triggerOrderType
  ) {
    return undefined;
  }

  return getDecreasePositionAmounts({
    marketInfo: p.position.marketInfo,
    collateralToken: p.position.collateralToken,
    isLong: p.position.isLong,
    position: p.position,
    closeSizeUsd: p.closeSizeUsd,
    keepLeverage: p.keepLeverage ?? true,
    triggerPrice: p.triggerPrice,
    userReferralInfo: p.userReferralInfo,
    minCollateralUsd: p.minCollateralUsd,
    minPositionSizeUsd: p.minPositionSizeUsd,
    uiFeeFactor: p.uiFeeFactor,
    isLimit: p.isLimit,
    limitPrice: p.limitPrice,
    triggerOrderType: p.triggerOrderType,
    isSetAcceptablePriceImpactEnabled: p.isSetAcceptablePriceImpactEnabled,
  });
}

export type TpSlCreatePayloadEntry = {
  amounts?: DecreasePositionAmounts;
  executionFeeAmount?: bigint;
  executionGasLimit?: bigint;
};

export function buildTpSlCreatePayloads(p: {
  autoCancelOrdersLimit: number;
  chainId: number;
  account: string | undefined;
  marketAddress: string | undefined;
  indexTokenAddress: string | undefined;
  collateralTokenAddress: string | undefined;
  isLong: boolean | undefined;
  entries: TpSlCreatePayloadEntry[];
  userReferralCode: string | undefined;
}) {
  if (
    !p.account ||
    !p.marketAddress ||
    !p.indexTokenAddress ||
    !p.collateralTokenAddress ||
    typeof p.isLong !== "boolean"
  ) {
    return [];
  }

  const { account, marketAddress, indexTokenAddress, collateralTokenAddress, isLong } = p;

  const validEntries = p.entries.filter((item): item is TpSlCreatePayloadEntry & { amounts: DecreasePositionAmounts } =>
    Boolean(item.amounts)
  );

  return validEntries.map((item, i) => {
    const amounts = item.amounts;

    return buildDecreaseOrderPayload({
      chainId: p.chainId as any,
      receiver: account,
      collateralDeltaAmount: amounts.collateralDeltaAmount ?? 0n,
      collateralTokenAddress,
      sizeDeltaUsd: amounts.sizeDeltaUsd,
      sizeDeltaInTokens: amounts.sizeDeltaInTokens,
      referralCode: p.userReferralCode,
      uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT,
      allowedSlippage: 0,
      orderType: amounts.triggerOrderType ?? OrderType.LimitDecrease,
      autoCancel: i < p.autoCancelOrdersLimit,
      swapPath: [],
      externalSwapQuote: undefined,
      marketAddress,
      indexTokenAddress,
      isLong,
      acceptablePrice: amounts.acceptablePrice ?? 0n,
      triggerPrice: amounts.triggerPrice ?? 0n,
      receiveTokenAddress: collateralTokenAddress,
      minOutputUsd: 0n,
      decreasePositionSwapType: amounts.decreaseSwapType ?? DecreasePositionSwapType.NoSwap,
      executionFeeAmount: item.executionFeeAmount ?? 0n,
      executionGasLimit: item.executionGasLimit ?? 0n,
      validFromTime: 0n,
    });
  });
}
