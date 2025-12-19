import { t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { useMarketInfo } from "context/SyntheticsStateContext/hooks/marketHooks";
import {
  selectChainId,
  selectGasLimits,
  selectGasPrice,
  selectIsAutoCancelTPSLEnabled,
  selectMaxAutoCancelOrders,
  selectPositionConstants,
  selectTokensData,
  selectUiFeeFactor,
  selectUserReferralInfo,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectOrderEditorExistingPosition,
  selectOrderEditorIncreaseAmounts,
  selectOrderEditorIndexToken,
  selectOrderEditorNextPositionValuesForIncrease,
  selectOrderEditorOrder,
  selectOrderEditorPositionKey,
  selectOrderEditorSizeDeltaUsd,
  selectOrderEditorTriggerPrice,
} from "context/SyntheticsStateContext/selectors/orderEditorSelectors";
import { makeSelectOrdersByPositionKey } from "context/SyntheticsStateContext/selectors/orderSelectors";
import { selectIsSetAcceptablePriceImpactEnabled } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateOrderOraclePriceCount,
  ExecutionFee,
} from "domain/synthetics/fees";
import { MarketInfo, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import {
  DecreasePositionSwapType,
  OrderType,
  PositionOrderInfo,
  isLimitIncreaseOrderType,
  isPositionOrder,
  isStopIncreaseOrderType,
} from "domain/synthetics/orders";
import { PositionInfo } from "domain/synthetics/positions";
import { getPendingMockPosition } from "domain/synthetics/positions/usePositions";
import { EntryField, SidecarSlTpOrderEntry } from "domain/synthetics/sidecarOrders/types";
import {
  MAX_PERCENTAGE,
  PERCENTAGE_DECIMALS,
  getDefaultEntryField,
  handleEntryError,
} from "domain/synthetics/sidecarOrders/utils";
import { TokenData, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { DecreasePositionAmounts, getDecreasePositionAmounts } from "domain/synthetics/trade";
import { getExecutionFee } from "sdk/utils/fees/executionFee";
import { buildDecreaseOrderPayload } from "sdk/utils/orderTransactions";

export function useOrderEditorTPSL() {
  const orderInfo = useSelector(selectOrderEditorOrder);
  const order = orderInfo && isPositionOrder(orderInfo) ? orderInfo : undefined;
  const existingPosition = useSelector(selectOrderEditorExistingPosition);
  const sizeDeltaUsd = useSelector(selectOrderEditorSizeDeltaUsd);
  const triggerPrice = useSelector(selectOrderEditorTriggerPrice);
  const indexToken = useSelector(selectOrderEditorIndexToken);
  const increaseAmounts = useSelector(selectOrderEditorIncreaseAmounts);
  const nextPositionValuesForIncrease = useSelector(selectOrderEditorNextPositionValuesForIncrease);
  const positionKey = useSelector(selectOrderEditorPositionKey);
  const { minCollateralUsd, minPositionSizeUsd } = useSelector(selectPositionConstants);
  const gasLimits = useSelector(selectGasLimits);
  const gasPrice = useSelector(selectGasPrice);
  const tokensData = useSelector(selectTokensData);
  const chainId = useSelector(selectChainId)!;
  const isAutoCancelTPSL = useSelector(selectIsAutoCancelTPSLEnabled);
  const maxAutoCancelOrders = useSelector(selectMaxAutoCancelOrders);
  const userReferralInfo = useSelector(selectUserReferralInfo);
  const uiFeeFactor = useSelector(selectUiFeeFactor)!;
  const isSetAcceptablePriceImpactEnabled = useSelector(selectIsSetAcceptablePriceImpactEnabled);
  const selectOrdersByPositionKey = useMemo(() => makeSelectOrdersByPositionKey(positionKey), [positionKey]);
  const positionOrders = useSelector(selectOrdersByPositionKey);
  const market = useMarketInfo(order?.marketAddress ?? "");
  const markPrice = order ? (order.isLong ? indexToken?.prices?.minPrice : indexToken?.prices?.maxPrice) : undefined;
  const positionIndexToken = order?.indexToken;

  const [isTpSlEnabled, setIsTpSlEnabled] = useState(false);
  const [tpPriceInputValue, setTpPriceInputValue] = useState("");
  const [slPriceInputValue, setSlPriceInputValue] = useState("");

  useEffect(() => {
    setIsTpSlEnabled(false);
    setTpPriceInputValue("");
    setSlPriceInputValue("");
  }, [order?.key]);

  const isLimitOrStopIncrease = order
    ? isLimitIncreaseOrderType(order.orderType) || isStopIncreaseOrderType(order.orderType)
    : false;

  const resolvedSizeDeltaUsd = sizeDeltaUsd ?? order?.sizeDeltaUsd ?? 0n;
  const resolvedTriggerPrice = triggerPrice ?? order?.triggerPrice;

  const totalSizeUsdForTpSl = useMemo(() => {
    return calculateTotalSizeUsd({
      existingPositionSizeUsd: existingPosition?.sizeInUsd,
      isLimitOrStopIncrease,
      order,
      sizeDeltaUsd: resolvedSizeDeltaUsd,
    });
  }, [existingPosition?.sizeInUsd, isLimitOrStopIncrease, order, resolvedSizeDeltaUsd]);

  const totalSizeInTokensForTpSl = useMemo(() => {
    return calculateTotalSizeInTokens({
      baseSizeInTokens: existingPosition?.sizeInTokens,
      increaseSizeDeltaInTokens: increaseAmounts?.sizeDeltaInTokens,
      isLimitOrStopIncrease,
      order,
      positionIndexToken,
      sizeDeltaUsd: resolvedSizeDeltaUsd,
      triggerPrice: resolvedTriggerPrice,
    });
  }, [
    existingPosition?.sizeInTokens,
    increaseAmounts?.sizeDeltaInTokens,
    isLimitOrStopIncrease,
    order,
    positionIndexToken,
    resolvedSizeDeltaUsd,
    resolvedTriggerPrice,
  ]);

  const collateralDeltaAmountForTpSl = useMemo(
    () =>
      resolveCollateralDeltaAmount({
        collateralDeltaAmount: increaseAmounts?.collateralDeltaAmount,
        isLimitOrStopIncrease,
        order,
      }),
    [increaseAmounts?.collateralDeltaAmount, isLimitOrStopIncrease, order]
  );

  const totalCollateralAmountForTpSl = (existingPosition?.collateralAmount ?? 0n) + collateralDeltaAmountForTpSl;

  const collateralDeltaUsdForTpSl = useMemo(
    () =>
      resolveCollateralDeltaUsd({
        collateralDeltaAmount: collateralDeltaAmountForTpSl,
        collateralDeltaUsd: increaseAmounts?.collateralDeltaUsd,
        isLimitOrStopIncrease,
        order,
      }),
    [collateralDeltaAmountForTpSl, increaseAmounts?.collateralDeltaUsd, isLimitOrStopIncrease, order]
  );

  const totalCollateralUsdForTpSl = (existingPosition?.collateralUsd ?? 0n) + collateralDeltaUsdForTpSl;

  const positionForTpSl = useMemo(
    () =>
      buildPositionForTpSl({
        existingPosition,
        isLimitOrStopIncrease,
        markPrice,
        market,
        nextPositionValuesForIncrease,
        order,
        positionKey,
        totalCollateralAmountForTpSl,
        totalCollateralUsdForTpSl,
        totalSizeInTokensForTpSl,
        totalSizeUsdForTpSl,
        triggerPrice: resolvedTriggerPrice,
      }),
    [
      existingPosition,
      isLimitOrStopIncrease,
      markPrice,
      market,
      nextPositionValuesForIncrease,
      order,
      positionKey,
      resolvedTriggerPrice,
      totalCollateralAmountForTpSl,
      totalCollateralUsdForTpSl,
      totalSizeInTokensForTpSl,
      totalSizeUsdForTpSl,
    ]
  );

  const tpSlPositionData = useMemo(
    () =>
      positionForTpSl && {
        sizeInUsd: positionForTpSl.sizeInUsd,
        sizeInTokens: positionForTpSl.sizeInTokens,
        collateralUsd: positionForTpSl.collateralUsd ?? 0n,
        entryPrice: positionForTpSl.entryPrice ?? 0n,
        liquidationPrice: positionForTpSl.liquidationPrice,
        isLong: positionForTpSl.isLong,
        indexTokenDecimals: positionForTpSl.marketInfo.indexToken.decimals,
        visualMultiplier: indexToken?.visualMultiplier,
      },
    [indexToken?.visualMultiplier, positionForTpSl]
  );

  const tpPriceField = useMemo(
    () => getDefaultEntryField(USD_DECIMALS, { input: tpPriceInputValue }, indexToken?.visualMultiplier),
    [indexToken?.visualMultiplier, tpPriceInputValue]
  );

  const slPriceField = useMemo(
    () => getDefaultEntryField(USD_DECIMALS, { input: slPriceInputValue }, indexToken?.visualMultiplier),
    [indexToken?.visualMultiplier, slPriceInputValue]
  );

  const tpEntry = useMemo<SidecarSlTpOrderEntry>(
    () =>
      buildTpSlEntry({
        existingPosition,
        id: "tp",
        isLimitOrStopIncrease,
        isTpSlEnabled,
        markPrice,
        order,
        positionForTpSl,
        priceField: tpPriceField,
        triggerPrice: resolvedTriggerPrice,
      }),
    [
      existingPosition,
      isLimitOrStopIncrease,
      isTpSlEnabled,
      markPrice,
      positionForTpSl,
      resolvedTriggerPrice,
      tpPriceField,
      order,
    ]
  );

  const slEntry = useMemo<SidecarSlTpOrderEntry>(
    () =>
      buildTpSlEntry({
        existingPosition,
        id: "sl",
        isLimitOrStopIncrease,
        isTpSlEnabled,
        markPrice,
        order,
        positionForTpSl,
        priceField: slPriceField,
        triggerPrice: resolvedTriggerPrice,
      }),
    [
      existingPosition,
      isLimitOrStopIncrease,
      isTpSlEnabled,
      markPrice,
      positionForTpSl,
      resolvedTriggerPrice,
      slPriceField,
      order,
    ]
  );

  const tpDecreaseAmounts = useMemo(
    () =>
      getDecreaseAmountsForEntry({
        isSetAcceptablePriceImpactEnabled,
        isTpSlEnabled,
        minCollateralUsd,
        minPositionSizeUsd,
        order,
        positionForTpSl,
        priceField: tpEntry.price,
        triggerOrderType: OrderType.LimitDecrease,
        triggerPrice: resolvedTriggerPrice,
        uiFeeFactor,
        userReferralInfo,
      }),
    [
      isSetAcceptablePriceImpactEnabled,
      isTpSlEnabled,
      minCollateralUsd,
      minPositionSizeUsd,
      order,
      positionForTpSl,
      resolvedTriggerPrice,
      tpEntry.price,
      uiFeeFactor,
      userReferralInfo,
    ]
  );

  const slDecreaseAmounts = useMemo(
    () =>
      getDecreaseAmountsForEntry({
        isSetAcceptablePriceImpactEnabled,
        isTpSlEnabled,
        minCollateralUsd,
        minPositionSizeUsd,
        order,
        positionForTpSl,
        priceField: slEntry.price,
        triggerOrderType: OrderType.StopLossDecrease,
        triggerPrice: resolvedTriggerPrice,
        uiFeeFactor,
        userReferralInfo,
      }),
    [
      isSetAcceptablePriceImpactEnabled,
      isTpSlEnabled,
      minCollateralUsd,
      minPositionSizeUsd,
      order,
      positionForTpSl,
      resolvedTriggerPrice,
      slEntry.price,
      uiFeeFactor,
      userReferralInfo,
    ]
  );

  const getSidecarExecutionFee = useCallback(
    (decreaseSwapType: DecreasePositionSwapType | undefined) => {
      if (!gasLimits || !tokensData || gasPrice === undefined) return undefined;

      const estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {
        decreaseSwapType,
        swapsCount: 0,
      });

      const oraclePriceCount = estimateOrderOraclePriceCount(0);

      return getExecutionFee(chainId as any, gasLimits, tokensData, estimatedGas, gasPrice, oraclePriceCount);
    },
    [chainId, gasLimits, gasPrice, tokensData]
  );

  const tpExecutionFee = useMemo(() => {
    if (!isTpSlEnabled || !tpDecreaseAmounts) return undefined;
    return getSidecarExecutionFee(tpDecreaseAmounts.decreaseSwapType);
  }, [getSidecarExecutionFee, isTpSlEnabled, tpDecreaseAmounts]);

  const slExecutionFee = useMemo(() => {
    if (!isTpSlEnabled || !slDecreaseAmounts) return undefined;
    return getSidecarExecutionFee(slDecreaseAmounts.decreaseSwapType);
  }, [getSidecarExecutionFee, isTpSlEnabled, slDecreaseAmounts]);

  const sidecarExecutionFee: Pick<ExecutionFee, "feeToken" | "feeTokenAmount" | "feeUsd"> | undefined = useMemo(() => {
    const fees = [tpExecutionFee, slExecutionFee].filter(Boolean);
    if (!fees.length) return undefined;

    const feeToken = fees[0]!.feeToken;
    const feeTokenAmount = fees.reduce((acc, fee) => acc + (fee?.feeTokenAmount ?? 0n), 0n);
    const feeUsd = fees.reduce((acc, fee) => acc + (fee?.feeUsd ?? 0n), 0n);

    return {
      feeToken,
      feeTokenAmount,
      feeUsd,
    };
  }, [slExecutionFee, tpExecutionFee]);

  const autoCancelOrdersLimit = useMemo(() => {
    if (!isAutoCancelTPSL || maxAutoCancelOrders === undefined) {
      return 0;
    }

    const existingAutoCancel = positionOrders?.filter((o) => o.autoCancel)?.length ?? 0;
    const left = Number(maxAutoCancelOrders) - existingAutoCancel;
    return left > 0 ? left : 0;
  }, [isAutoCancelTPSL, maxAutoCancelOrders, positionOrders]);

  const tpSlCreatePayloads = useMemo(
    () =>
      buildTpSlCreatePayloads({
        autoCancelOrdersLimit,
        chainId,
        isTpSlEnabled,
        order,
        positionForTpSl,
        slDecreaseAmounts,
        slEntry,
        slExecutionFee,
        tpDecreaseAmounts,
        tpEntry,
        tpExecutionFee,
        userReferralCode: userReferralInfo?.referralCodeForTxn,
      }),
    [
      autoCancelOrdersLimit,
      chainId,
      isTpSlEnabled,
      positionForTpSl,
      order,
      tpEntry,
      tpDecreaseAmounts,
      tpExecutionFee,
      slEntry,
      slDecreaseAmounts,
      slExecutionFee,
      userReferralInfo?.referralCodeForTxn,
    ]
  );

  const { hasTpSlValues, tpSlError, tpSlHasError } = useMemo(
    () =>
      resolveTpSlErrorState({
        isTpSlEnabled,
        positionForTpSl,
        slDecreaseAmounts,
        slEntry,
        slPriceField,
        tpDecreaseAmounts,
        tpEntry,
        tpPriceField,
      }),
    [isTpSlEnabled, positionForTpSl, slDecreaseAmounts, slEntry, slPriceField, tpDecreaseAmounts, tpEntry, tpPriceField]
  );

  return {
    isLimitOrStopIncrease,
    isTpSlEnabled,
    setIsTpSlEnabled,
    tpEntry,
    slEntry,
    tpSlPositionData,
    tpSlCreatePayloads,
    sidecarExecutionFee,
    tpSlError,
    tpSlHasError,
    hasTpSlValues,
    setTpPriceInputValue,
    setSlPriceInputValue,
  };
}

type NextPositionValues =
  | {
      nextEntryPrice?: bigint;
      nextLiqPrice?: bigint;
      nextLeverage?: bigint;
      leverageWithPnl?: bigint;
      leverageWithoutPnl?: bigint;
    }
  | undefined;

type PositionForTpSl = PositionInfo & {
  marketInfo: MarketInfo;
  collateralToken: TokenData;
  pnlToken: TokenData;
  triggerPrice?: bigint;
};

function calculateTotalSizeUsd(p: {
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

function calculateTotalSizeInTokens(p: {
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

function resolveCollateralDeltaAmount(p: {
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

function resolveCollateralDeltaUsd(p: {
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

function buildPositionForTpSl(p: {
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
}): PositionForTpSl | undefined {
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
    triggerPrice: p.triggerPrice ?? p.order.triggerPrice,
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

function buildTpSlEntry(p: {
  existingPosition: PositionInfo | undefined;
  id: "tp" | "sl";
  isLimitOrStopIncrease: boolean;
  isTpSlEnabled: boolean;
  markPrice: bigint | undefined;
  order: PositionOrderInfo | undefined;
  positionForTpSl: PositionForTpSl | undefined;
  priceField: EntryField;
  triggerPrice: bigint | undefined;
}): SidecarSlTpOrderEntry {
  const sizeUsdField = getDefaultEntryField(USD_DECIMALS, { value: p.positionForTpSl?.sizeInUsd ?? null });
  const percentageField = getDefaultEntryField(PERCENTAGE_DECIMALS, { value: MAX_PERCENTAGE });

  const entry: SidecarSlTpOrderEntry = {
    id: p.id,
    price: p.priceField,
    sizeUsd: sizeUsdField,
    percentage: percentageField,
    mode: "keepPercentage",
    order: null,
    txnType: p.priceField.value ? "create" : null,
    decreaseAmounts: undefined,
    increaseAmounts: undefined,
  };

  if (!p.isLimitOrStopIncrease || !p.isTpSlEnabled) {
    return entry;
  }

  return handleEntryError(entry, p.id, {
    liqPrice: p.positionForTpSl?.liquidationPrice,
    triggerPrice: p.triggerPrice ?? p.order?.triggerPrice,
    markPrice: p.markPrice,
    isLong: p.order?.isLong,
    isLimit: true,
    isExistingPosition: Boolean(p.existingPosition),
  });
}

function getDecreaseAmountsForEntry(p: {
  isSetAcceptablePriceImpactEnabled: boolean;
  isTpSlEnabled: boolean;
  minCollateralUsd: bigint | undefined;
  minPositionSizeUsd: bigint | undefined;
  order: PositionOrderInfo | undefined;
  positionForTpSl: PositionForTpSl | undefined;
  priceField: EntryField;
  triggerOrderType: OrderType.LimitDecrease | OrderType.StopLossDecrease;
  triggerPrice: bigint | undefined;
  uiFeeFactor: bigint;
  userReferralInfo: ReturnType<typeof selectUserReferralInfo> | undefined;
}): DecreasePositionAmounts | undefined {
  if (
    !p.isTpSlEnabled ||
    !p.positionForTpSl ||
    !p.order ||
    typeof p.priceField.value !== "bigint" ||
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
    triggerPrice: p.priceField.value,
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

function buildTpSlCreatePayloads(p: {
  autoCancelOrdersLimit: number;
  chainId: number;
  isTpSlEnabled: boolean;
  order: PositionOrderInfo | undefined;
  positionForTpSl: PositionForTpSl | undefined;
  slDecreaseAmounts: DecreasePositionAmounts | undefined;
  slEntry: SidecarSlTpOrderEntry;
  slExecutionFee: Pick<ExecutionFee, "feeToken" | "feeTokenAmount" | "feeUsd"> | undefined;
  tpDecreaseAmounts: DecreasePositionAmounts | undefined;
  tpEntry: SidecarSlTpOrderEntry;
  tpExecutionFee: Pick<ExecutionFee, "feeToken" | "feeTokenAmount" | "feeUsd"> | undefined;
  userReferralCode: string | undefined;
}) {
  if (!p.isTpSlEnabled || !p.positionForTpSl || !p.order) {
    return [];
  }

  const order = p.order;

  const entries = [
    {
      type: "tp" as const,
      entry: p.tpEntry,
      amounts: p.tpDecreaseAmounts,
      executionFee: p.tpExecutionFee,
    },
    {
      type: "sl" as const,
      entry: p.slEntry,
      amounts: p.slDecreaseAmounts,
      executionFee: p.slExecutionFee,
    },
  ].filter(
    (item) => typeof item.entry.price.value === "bigint" && !item.entry.price.error && item.amounts !== undefined
  );

  return entries.map((item, i) =>
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

function resolveTpSlErrorState(p: {
  isTpSlEnabled: boolean;
  positionForTpSl: PositionForTpSl | undefined;
  slDecreaseAmounts: DecreasePositionAmounts | undefined;
  slEntry: SidecarSlTpOrderEntry;
  slPriceField: EntryField;
  tpDecreaseAmounts: DecreasePositionAmounts | undefined;
  tpEntry: SidecarSlTpOrderEntry;
  tpPriceField: EntryField;
}) {
  const hasTpSlValues = typeof p.tpPriceField.value === "bigint" || typeof p.slPriceField.value === "bigint";
  const tpSlHasError =
    p.isTpSlEnabled &&
    (!p.positionForTpSl ||
      Boolean(p.tpEntry.price.error) ||
      Boolean(p.slEntry.price.error) ||
      (!p.tpDecreaseAmounts && typeof p.tpPriceField.value === "bigint") ||
      (!p.slDecreaseAmounts && typeof p.slPriceField.value === "bigint"));

  const tpSlError =
    p.isTpSlEnabled && !hasTpSlValues
      ? t`Enter TP/SL price`
      : tpSlHasError
        ? t`There are issues in the TP/SL orders.`
        : undefined;

  return {
    hasTpSlValues,
    tpSlError,
    tpSlHasError,
  };
}
