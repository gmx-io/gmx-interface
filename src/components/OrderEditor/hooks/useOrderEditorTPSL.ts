import { t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";

import { USD_DECIMALS } from "config/factors";
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
import {
  DecreasePositionSwapType,
  OrderType,
  PositionOrderInfo,
  isLimitIncreaseOrderType,
  isPositionOrder,
  isStopIncreaseOrderType,
} from "domain/synthetics/orders";
import { PositionInfo, PositionInfoLoaded } from "domain/synthetics/positions";
import { EntryField, SidecarSlTpOrderEntry } from "domain/synthetics/sidecarOrders/types";
import {
  getDefaultEntryField,
  handleEntryError,
  MAX_PERCENTAGE,
  PERCENTAGE_DECIMALS,
} from "domain/synthetics/sidecarOrders/utils";
import type { NextPositionValues } from "domain/synthetics/trade";
import {
  buildTpSlCreatePayloads,
  buildTpSlInputPositionData,
  buildTpSlPositionInfo,
  getTpSlDecreaseAmounts,
} from "domain/tpsl/sidecar";
import {
  calculateTotalSizeInTokens,
  calculateTotalSizeUsd,
  getCollateralDeltaAmount,
  getCollateralDeltaUsd,
} from "domain/tpsl/utils";
import { getExecutionFee } from "sdk/utils/fees/executionFee";
import { getIsEquivalentTokens } from "sdk/utils/tokens";
import { DecreasePositionAmounts } from "sdk/utils/trade";

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
      getCollateralDeltaAmount({
        collateralDeltaAmount: increaseAmounts?.collateralDeltaAmount,
        isLimitOrStopIncrease,
        order,
      }),
    [increaseAmounts?.collateralDeltaAmount, isLimitOrStopIncrease, order]
  );

  const totalCollateralAmountForTpSl = (existingPosition?.collateralAmount ?? 0n) + collateralDeltaAmountForTpSl;

  const collateralDeltaUsdForTpSl = useMemo(
    () =>
      getCollateralDeltaUsd({
        collateralDeltaAmount: collateralDeltaAmountForTpSl,
        collateralDeltaUsd: increaseAmounts?.collateralDeltaUsd,
        isLimitOrStopIncrease,
        order,
      }),
    [collateralDeltaAmountForTpSl, increaseAmounts?.collateralDeltaUsd, isLimitOrStopIncrease, order]
  );

  const totalCollateralUsdForTpSl = (existingPosition?.collateralUsd ?? 0n) + collateralDeltaUsdForTpSl;

  const positionForTpSl = useMemo(() => {
    return getPositionForTpSl({
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
    });
  }, [
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
  ]);

  const tpSlPositionData = useMemo(
    () =>
      buildTpSlInputPositionData({
        position: positionForTpSl,
        indexTokenDecimals: positionForTpSl?.marketInfo.indexToken.decimals ?? 18,
        collateralTokenDecimals: positionForTpSl?.collateralToken.decimals,
        isCollateralTokenEquivalentToIndex: positionForTpSl
          ? getIsEquivalentTokens(positionForTpSl.collateralToken, positionForTpSl.indexToken)
          : undefined,
        visualMultiplier: indexToken?.visualMultiplier,
      }),
    [indexToken?.visualMultiplier, positionForTpSl]
  );

  const tpPriceEntry = useMemo(
    () => getDefaultEntryField(USD_DECIMALS, { input: tpPriceInputValue }, indexToken?.visualMultiplier),
    [indexToken?.visualMultiplier, tpPriceInputValue]
  );

  const slPriceEntry = useMemo(
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
        priceEntry: tpPriceEntry,
        triggerPrice: resolvedTriggerPrice,
      }),
    [
      existingPosition,
      isLimitOrStopIncrease,
      isTpSlEnabled,
      markPrice,
      positionForTpSl,
      resolvedTriggerPrice,
      tpPriceEntry,
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
        priceEntry: slPriceEntry,
        triggerPrice: resolvedTriggerPrice,
      }),
    [
      existingPosition,
      isLimitOrStopIncrease,
      isTpSlEnabled,
      markPrice,
      positionForTpSl,
      resolvedTriggerPrice,
      slPriceEntry,
      order,
    ]
  );

  const tpDecreaseAmounts = useMemo(() => {
    if (!isTpSlEnabled) {
      return undefined;
    }

    return getTpSlDecreaseAmounts({
      isSetAcceptablePriceImpactEnabled,
      position: positionForTpSl,
      closeSizeUsd: positionForTpSl?.sizeInUsd,
      triggerPrice: tpEntry.price.value,
      triggerOrderType: OrderType.LimitDecrease,
      isLimit: true,
      limitPrice: resolvedTriggerPrice ?? order?.triggerPrice,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      userReferralInfo,
    });
  }, [
    isSetAcceptablePriceImpactEnabled,
    isTpSlEnabled,
    minCollateralUsd,
    minPositionSizeUsd,
    order?.triggerPrice,
    positionForTpSl,
    resolvedTriggerPrice,
    tpEntry.price.value,
    uiFeeFactor,
    userReferralInfo,
  ]);

  const slDecreaseAmounts = useMemo(() => {
    if (!isTpSlEnabled) {
      return undefined;
    }

    return getTpSlDecreaseAmounts({
      isSetAcceptablePriceImpactEnabled,
      position: positionForTpSl,
      closeSizeUsd: positionForTpSl?.sizeInUsd,
      triggerPrice: slEntry.price.value,
      triggerOrderType: OrderType.StopLossDecrease,
      isLimit: true,
      limitPrice: resolvedTriggerPrice ?? order?.triggerPrice,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      userReferralInfo,
    });
  }, [
    isSetAcceptablePriceImpactEnabled,
    isTpSlEnabled,
    minCollateralUsd,
    minPositionSizeUsd,
    order?.triggerPrice,
    positionForTpSl,
    resolvedTriggerPrice,
    slEntry.price.value,
    uiFeeFactor,
    userReferralInfo,
  ]);

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

  const tpSlCreatePayloads = useMemo(() => {
    if (!isTpSlEnabled) {
      return [];
    }

    return buildTpSlCreatePayloads({
      autoCancelOrdersLimit,
      chainId,
      account: order?.account,
      marketAddress: order?.marketInfo.marketTokenAddress,
      indexTokenAddress: order?.indexToken.address,
      collateralTokenAddress: order?.targetCollateralToken.address,
      isLong: order?.isLong,
      entries: [
        { amounts: tpDecreaseAmounts, executionFeeAmount: tpExecutionFee?.feeTokenAmount },
        { amounts: slDecreaseAmounts, executionFeeAmount: slExecutionFee?.feeTokenAmount },
      ],
      userReferralCode: userReferralInfo?.referralCodeForTxn,
    });
  }, [
    autoCancelOrdersLimit,
    chainId,
    isTpSlEnabled,
    order?.account,
    order?.indexToken.address,
    order?.isLong,
    order?.marketInfo.marketTokenAddress,
    order?.targetCollateralToken.address,
    slDecreaseAmounts,
    slExecutionFee?.feeTokenAmount,
    tpDecreaseAmounts,
    tpExecutionFee?.feeTokenAmount,
    userReferralInfo?.referralCodeForTxn,
  ]);

  const { hasTpSlValues, tpSlError, tpSlHasError } = useMemo(
    () =>
      getTpSlErrorState({
        isTpSlEnabled,
        positionForTpSl,
        sl: {
          price: slPriceEntry.value,
          priceError: slPriceEntry.error,
          decreaseAmounts: slDecreaseAmounts,
        },
        tp: {
          price: tpPriceEntry.value,
          priceError: tpPriceEntry.error,
          decreaseAmounts: tpDecreaseAmounts,
        },
      }),
    [
      isTpSlEnabled,
      positionForTpSl,
      slDecreaseAmounts,
      slPriceEntry.error,
      slPriceEntry.value,
      tpDecreaseAmounts,
      tpPriceEntry.error,
      tpPriceEntry.value,
    ]
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

function getPositionForTpSl(p: {
  existingPosition: PositionInfo | undefined;
  isLimitOrStopIncrease: boolean;
  markPrice: bigint | undefined;
  market: ReturnType<typeof useMarketInfo>;
  nextPositionValuesForIncrease: NextPositionValues | undefined;
  order: PositionOrderInfo | undefined;
  positionKey: string | undefined;
  resolvedTriggerPrice: bigint | undefined;
  totalCollateralAmountForTpSl: bigint;
  totalCollateralUsdForTpSl: bigint;
  totalSizeInTokensForTpSl: bigint;
  totalSizeUsdForTpSl: bigint;
}): PositionInfoLoaded | undefined {
  if (!p.isLimitOrStopIncrease || !p.market || !p.order || !p.positionKey) {
    return undefined;
  }

  const nextEntryPrice =
    p.nextPositionValuesForIncrease?.nextEntryPrice ??
    p.existingPosition?.entryPrice ??
    p.resolvedTriggerPrice ??
    p.order.triggerPrice;
  const nextLiqPrice = p.nextPositionValuesForIncrease?.nextLiqPrice ?? p.existingPosition?.liquidationPrice;
  const baseMarkPrice = p.markPrice ?? p.existingPosition?.markPrice ?? 0n;
  const nextLeverage = p.nextPositionValuesForIncrease?.nextLeverage;

  return buildTpSlPositionInfo({
    isIncrease: true,
    positionKey: p.positionKey,
    marketInfo: p.market,
    collateralToken: p.order.targetCollateralToken,
    isLong: p.order.isLong,
    sizeDeltaUsd: p.totalSizeUsdForTpSl,
    sizeDeltaInTokens: p.totalSizeInTokensForTpSl,
    collateralDeltaAmount: p.totalCollateralAmountForTpSl,
    markPrice: baseMarkPrice,
    entryPrice: nextEntryPrice,
    liquidationPrice: nextLiqPrice,
    collateralUsd: p.totalCollateralUsdForTpSl,
    remainingCollateralUsd: p.totalCollateralUsdForTpSl,
    remainingCollateralAmount: p.totalCollateralAmountForTpSl,
    netValue: p.totalCollateralUsdForTpSl,
    leverage: nextLeverage,
    leverageWithPnl: nextLeverage,
    leverageWithoutPnl: nextLeverage,
    existingPosition: p.existingPosition,
    includeExistingFees: true,
    requirePositiveSizes: true,
  });
}

function buildTpSlEntry(p: {
  existingPosition: PositionInfo | undefined;
  id: "tp" | "sl";
  isLimitOrStopIncrease: boolean;
  isTpSlEnabled: boolean;
  markPrice: bigint | undefined;
  order: PositionOrderInfo | undefined;
  positionForTpSl: PositionInfoLoaded | undefined;
  priceEntry: EntryField;
  triggerPrice: bigint | undefined;
}): SidecarSlTpOrderEntry {
  const sizeUsdEntry = getDefaultEntryField(USD_DECIMALS, { value: p.positionForTpSl?.sizeInUsd ?? null });
  const percentageEntry = getDefaultEntryField(PERCENTAGE_DECIMALS, { value: MAX_PERCENTAGE });

  const entry: SidecarSlTpOrderEntry = {
    id: p.id,
    price: p.priceEntry,
    sizeUsd: sizeUsdEntry,
    percentage: percentageEntry,
    mode: "keepPercentage",
    order: null,
    txnType: p.priceEntry.value ? "create" : null,
    decreaseAmounts: undefined,
    increaseAmounts: undefined,
  };

  if (!p.isLimitOrStopIncrease || !p.isTpSlEnabled) {
    return entry;
  }

  return handleEntryError(entry, p.id, {
    liqPrice: p.positionForTpSl?.liquidationPrice,
    entryPrice: p.positionForTpSl?.entryPrice,
    triggerPrice: p.triggerPrice ?? p.order?.triggerPrice,
    markPrice: p.markPrice,
    isLong: p.order?.isLong,
    isLimit: true,
    isExistingPosition: Boolean(p.existingPosition),
  });
}

export type TpSlValidationInput = {
  price: bigint | null | undefined;
  priceError?: string | null;
  decreaseAmounts?: DecreasePositionAmounts;
};

export function getTpSlErrorState(p: {
  isTpSlEnabled: boolean;
  positionForTpSl: PositionInfoLoaded | undefined;
  sl: TpSlValidationInput;
  tp: TpSlValidationInput;
}) {
  const hasTpSlValues = typeof p.tp.price === "bigint" || typeof p.sl.price === "bigint";
  const hasEntryErrors = Boolean(p.tp.priceError) || Boolean(p.sl.priceError);
  const hasInvalidTp = !p.tp.decreaseAmounts && typeof p.tp.price === "bigint";
  const hasInvalidSl = !p.sl.decreaseAmounts && typeof p.sl.price === "bigint";

  const tpSlHasError = p.isTpSlEnabled && (!p.positionForTpSl || hasEntryErrors || hasInvalidTp || hasInvalidSl);

  let tpSlError: string | undefined;

  if (p.isTpSlEnabled && !hasTpSlValues) {
    tpSlError = t`Enter TP/SL price`;
  } else if (tpSlHasError) {
    tpSlError = t`There are issues in the TP/SL orders.`;
  }

  return {
    hasTpSlValues,
    tpSlError,
    tpSlHasError,
  };
}
