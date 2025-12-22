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
  isLimitIncreaseOrderType,
  isPositionOrder,
  isStopIncreaseOrderType,
} from "domain/synthetics/orders";
import { SidecarSlTpOrderEntry } from "domain/synthetics/sidecarOrders/types";
import { getDefaultEntryField } from "domain/synthetics/sidecarOrders/utils";
import {
  buildPositionInfoLoaded,
  buildTpSlCreatePayloads,
  buildTpSlEntry,
  calculateTotalSizeInTokens,
  calculateTotalSizeUsd,
  getCollateralDeltaAmount,
  getCollateralDeltaUsd,
  getDecreaseAmountsForEntry,
  getTpSlErrorState,
} from "domain/tpsl/utils";
import { getExecutionFee } from "sdk/utils/fees/executionFee";

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

  const positionForTpSl = useMemo(
    () =>
      buildPositionInfoLoaded({
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

  const tpDecreaseAmounts = useMemo(
    () =>
      getDecreaseAmountsForEntry({
        isSetAcceptablePriceImpactEnabled,
      isTpSlEnabled,
      minCollateralUsd,
      minPositionSizeUsd,
      order,
      positionForTpSl,
      priceEntry: tpEntry.price,
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
      priceEntry: slEntry.price,
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
      getTpSlErrorState({
        isTpSlEnabled,
        positionForTpSl,
        slDecreaseAmounts,
        slEntry,
        slPriceEntry,
        tpDecreaseAmounts,
        tpEntry,
        tpPriceEntry,
      }),
    [isTpSlEnabled, positionForTpSl, slDecreaseAmounts, slEntry, slPriceEntry, tpDecreaseAmounts, tpEntry, tpPriceEntry]
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
