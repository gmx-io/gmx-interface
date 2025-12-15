import { t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { UserReferralInfo } from "domain/referrals";
import { estimateExecuteDecreaseOrderGasLimit, estimateOrderOraclePriceCount } from "domain/synthetics/fees";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { MarketInfo } from "domain/synthetics/markets/types";
import {
  DecreasePositionSwapType,
  OrderType,
  PositionOrderInfo,
  isLimitIncreaseOrderType,
  isStopIncreaseOrderType,
} from "domain/synthetics/orders";
import { getPendingMockPosition } from "domain/synthetics/positions/usePositions";
import { SidecarSlTpOrderEntry } from "domain/synthetics/sidecarOrders/types";
import {
  MAX_PERCENTAGE,
  PERCENTAGE_DECIMALS,
  getDefaultEntryField,
  handleEntryError,
} from "domain/synthetics/sidecarOrders/utils";
import { convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { getDecreasePositionAmounts } from "domain/synthetics/trade";
import type { getIncreasePositionAmounts } from "domain/synthetics/trade";
import { NextPositionValues } from "domain/synthetics/trade/types";
import { TokensData, TokenData } from "domain/tokens";
import { GasLimitsConfig } from "sdk/types/fees";
import { PositionInfo } from "sdk/types/positions";
import { Token } from "sdk/types/tokens";
import { getExecutionFee } from "sdk/utils/fees/executionFee";
import { buildDecreaseOrderPayload } from "sdk/utils/orderTransactions";

type Params = {
  order?: PositionOrderInfo;
  existingPosition?: PositionInfo;
  sizeDeltaUsd?: bigint;
  triggerPrice?: bigint;
  markPrice?: bigint;
  indexToken?: TokenData;
  increaseAmounts?: ReturnType<typeof getIncreasePositionAmounts>;
  positionIndexToken?: TokenData;
  nextPositionValuesForIncrease?: NextPositionValues;
  positionKey?: string;
  market?: MarketInfo;
  userReferralInfo?: UserReferralInfo;
  uiFeeFactor: bigint;
  minCollateralUsd?: bigint;
  minPositionSizeUsd?: bigint;
  gasLimits?: GasLimitsConfig;
  gasPrice?: bigint;
  tokensData?: TokensData;
  chainId: number;
  isAutoCancelTPSL: boolean;
  maxAutoCancelOrders?: bigint;
  positionOrders?: PositionOrderInfo[];
  isSetAcceptablePriceImpactEnabled: boolean;
};

type SidecarExecutionFee = {
  feeToken: Token;
  feeTokenAmount: bigint;
  feeUsd?: bigint;
};

export function useOrderEditorTPSL({
  order,
  existingPosition,
  sizeDeltaUsd,
  triggerPrice,
  markPrice,
  indexToken,
  increaseAmounts,
  positionIndexToken,
  nextPositionValuesForIncrease,
  positionKey,
  market,
  userReferralInfo,
  uiFeeFactor,
  minCollateralUsd,
  minPositionSizeUsd,
  gasLimits,
  gasPrice,
  tokensData,
  chainId,
  isAutoCancelTPSL,
  maxAutoCancelOrders,
  positionOrders,
  isSetAcceptablePriceImpactEnabled,
}: Params) {
  const [isTpSlEnabled, setIsTpSlEnabled] = useState(false);
  const [tpPriceInputValue, setTpPriceInputValue] = useState("");
  const [slPriceInputValue, setSlPriceInputValue] = useState("");

  useEffect(() => {
    setIsTpSlEnabled(false);
    setTpPriceInputValue("");
    setSlPriceInputValue("");
  }, [order?.key]);

  const isLimitOrStopIncrease = useMemo(
    () => (order ? isLimitIncreaseOrderType(order.orderType) || isStopIncreaseOrderType(order.orderType) : false),
    [order]
  );

  const totalSizeUsdForTpSl = useMemo(() => {
    if (!isLimitOrStopIncrease || !order) return 0n;

    const baseSize = existingPosition?.sizeInUsd ?? 0n;
    const orderSize = sizeDeltaUsd ?? order.sizeDeltaUsd ?? 0n;

    return baseSize + orderSize;
  }, [existingPosition?.sizeInUsd, isLimitOrStopIncrease, order, sizeDeltaUsd]);

  const totalSizeInTokensForTpSl = useMemo(() => {
    if (!isLimitOrStopIncrease || !order) return 0n;

    const baseSizeInTokens = existingPosition?.sizeInTokens ?? 0n;

    const orderSizeInTokens =
      increaseAmounts?.sizeDeltaInTokens ??
      (positionIndexToken && (sizeDeltaUsd ?? order.sizeDeltaUsd)
        ? convertToTokenAmount(
            sizeDeltaUsd ?? order.sizeDeltaUsd,
            positionIndexToken.decimals,
            triggerPrice ?? order.triggerPrice
          ) ?? 0n
        : 0n);

    return baseSizeInTokens + (orderSizeInTokens ?? 0n);
  }, [
    existingPosition?.sizeInTokens,
    increaseAmounts?.sizeDeltaInTokens,
    isLimitOrStopIncrease,
    order,
    positionIndexToken,
    sizeDeltaUsd,
    triggerPrice,
  ]);

  const collateralDeltaAmountForTpSl =
    increaseAmounts?.collateralDeltaAmount ??
    (isLimitOrStopIncrease && order ? order.initialCollateralDeltaAmount : undefined) ??
    0n;

  const totalCollateralAmountForTpSl = (existingPosition?.collateralAmount ?? 0n) + collateralDeltaAmountForTpSl;

  const collateralDeltaUsdForTpSl =
    increaseAmounts?.collateralDeltaUsd ??
    convertToUsd(
      collateralDeltaAmountForTpSl,
      order?.targetCollateralToken.decimals,
      order?.targetCollateralToken.prices.minPrice
    ) ??
    0n;

  const totalCollateralUsdForTpSl = (existingPosition?.collateralUsd ?? 0n) + collateralDeltaUsdForTpSl;

  const positionForTpSl = useMemo(() => {
    if (
      !isLimitOrStopIncrease ||
      !market ||
      !order ||
      !positionKey ||
      totalSizeUsdForTpSl <= 0n ||
      totalSizeInTokensForTpSl <= 0n
    ) {
      return undefined;
    }

    const pending = getPendingMockPosition({
      isIncrease: true,
      positionKey,
      sizeDeltaUsd: totalSizeUsdForTpSl,
      sizeDeltaInTokens: totalSizeInTokensForTpSl,
      collateralDeltaAmount: totalCollateralAmountForTpSl,
      updatedAt: Date.now(),
      updatedAtBlock: 0n,
    });

    const nextEntryPrice =
      nextPositionValuesForIncrease?.nextEntryPrice ??
      existingPosition?.entryPrice ??
      triggerPrice ??
      order?.triggerPrice;

    const nextLiqPrice = nextPositionValuesForIncrease?.nextLiqPrice ?? existingPosition?.liquidationPrice;
    const baseMarkPrice = markPrice ?? existingPosition?.markPrice ?? 0n;

    return {
      ...pending,
      marketInfo: market,
      market,
      indexToken: market.indexToken,
      indexName: getMarketIndexName(market),
      poolName: getMarketPoolName(market),
      longToken: market.longToken,
      shortToken: market.shortToken,
      collateralToken: order.targetCollateralToken,
      pnlToken: order.isLong ? market.longToken : market.shortToken,
      markPrice: baseMarkPrice,
      entryPrice: nextEntryPrice,
      triggerPrice: triggerPrice ?? order.triggerPrice,
      liquidationPrice: nextLiqPrice,
      collateralUsd: totalCollateralUsdForTpSl,
      remainingCollateralUsd: totalCollateralUsdForTpSl,
      remainingCollateralAmount: totalCollateralAmountForTpSl,
      netValue: totalCollateralUsdForTpSl,
      hasLowCollateral: false,
      leverage: nextPositionValuesForIncrease?.nextLeverage ?? existingPosition?.leverage,
      leverageWithPnl: nextPositionValuesForIncrease?.nextLeverage ?? existingPosition?.leverageWithPnl,
      leverageWithoutPnl: nextPositionValuesForIncrease?.nextLeverage ?? existingPosition?.leverageWithoutPnl,
      pnl: 0n,
      pnlPercentage: 0n,
      pnlAfterFees: 0n,
      pnlAfterFeesPercentage: 0n,
      closingFeeUsd: 0n,
      uiFeeUsd: 0n,
      pendingFundingFeesUsd: existingPosition?.pendingFundingFeesUsd ?? 0n,
      pendingBorrowingFeesUsd: existingPosition?.pendingBorrowingFeesUsd ?? 0n,
      pendingClaimableFundingFeesUsd: existingPosition?.pendingClaimableFundingFeesUsd ?? 0n,
      pendingImpactAmount: existingPosition?.pendingImpactAmount ?? 0n,
      positionFeeAmount: existingPosition?.positionFeeAmount ?? 0n,
      netPriceImapctDeltaUsd: existingPosition?.netPriceImapctDeltaUsd ?? 0n,
      priceImpactDiffUsd: existingPosition?.priceImpactDiffUsd ?? 0n,
      traderDiscountAmount: existingPosition?.traderDiscountAmount ?? 0n,
      uiFeeAmount: existingPosition?.uiFeeAmount ?? 0n,
      pendingImpactUsd: existingPosition?.pendingImpactUsd ?? 0n,
      closePriceImpactDeltaUsd: existingPosition?.closePriceImpactDeltaUsd ?? 0n,
    };
  }, [
    existingPosition,
    order,
    isLimitOrStopIncrease,
    markPrice,
    market,
    nextPositionValuesForIncrease?.nextEntryPrice,
    nextPositionValuesForIncrease?.nextLeverage,
    nextPositionValuesForIncrease?.nextLiqPrice,
    positionKey,
    totalCollateralAmountForTpSl,
    totalCollateralUsdForTpSl,
    totalSizeInTokensForTpSl,
    totalSizeUsdForTpSl,
    triggerPrice,
  ]);

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

  const tpEntry = useMemo<SidecarSlTpOrderEntry>(() => {
    const sizeUsdField = getDefaultEntryField(USD_DECIMALS, { value: positionForTpSl?.sizeInUsd ?? null });
    const percentageField = getDefaultEntryField(PERCENTAGE_DECIMALS, { value: MAX_PERCENTAGE });

    const entry: SidecarSlTpOrderEntry = {
      id: "tp",
      price: tpPriceField,
      sizeUsd: sizeUsdField,
      percentage: percentageField,
      mode: "keepPercentage",
      order: null,
      txnType: tpPriceField.value ? "create" : null,
      decreaseAmounts: undefined,
      increaseAmounts: undefined,
    };

    if (!isTpSlEnabled || !isLimitOrStopIncrease) {
      return entry;
    }

    return handleEntryError(entry, "tp", {
      liqPrice: positionForTpSl?.liquidationPrice,
      triggerPrice: triggerPrice ?? order?.triggerPrice,
      markPrice,
      isLong: order?.isLong,
      isLimit: true,
      isExistingPosition: Boolean(existingPosition),
    });
  }, [
    existingPosition,
    isLimitOrStopIncrease,
    isTpSlEnabled,
    markPrice,
    positionForTpSl?.liquidationPrice,
    positionForTpSl?.sizeInUsd,
    order?.isLong,
    order?.triggerPrice,
    tpPriceField,
    triggerPrice,
  ]);

  const slEntry = useMemo<SidecarSlTpOrderEntry>(() => {
    const sizeUsdField = getDefaultEntryField(USD_DECIMALS, { value: positionForTpSl?.sizeInUsd ?? null });
    const percentageField = getDefaultEntryField(PERCENTAGE_DECIMALS, { value: MAX_PERCENTAGE });

    const entry: SidecarSlTpOrderEntry = {
      id: "sl",
      price: slPriceField,
      sizeUsd: sizeUsdField,
      percentage: percentageField,
      mode: "keepPercentage",
      order: null,
      txnType: slPriceField.value ? "create" : null,
      decreaseAmounts: undefined,
      increaseAmounts: undefined,
    };

    if (!isTpSlEnabled || !isLimitOrStopIncrease) {
      return entry;
    }

    return handleEntryError(entry, "sl", {
      liqPrice: positionForTpSl?.liquidationPrice,
      triggerPrice: triggerPrice ?? order?.triggerPrice,
      markPrice,
      isLong: order?.isLong,
      isLimit: true,
      isExistingPosition: Boolean(existingPosition),
    });
  }, [
    existingPosition,
    isLimitOrStopIncrease,
    isTpSlEnabled,
    markPrice,
    positionForTpSl?.liquidationPrice,
    positionForTpSl?.sizeInUsd,
    order?.isLong,
    order?.triggerPrice,
    slPriceField,
    triggerPrice,
  ]);

  const tpDecreaseAmounts = useMemo(() => {
    if (
      !isTpSlEnabled ||
      !positionForTpSl ||
      !order ||
      typeof tpEntry.price.value !== "bigint" ||
      minCollateralUsd === undefined ||
      minPositionSizeUsd === undefined
    ) {
      return undefined;
    }

    return getDecreasePositionAmounts({
      marketInfo: positionForTpSl.marketInfo,
      collateralToken: order.targetCollateralToken,
      isLong: order.isLong,
      position: positionForTpSl,
      closeSizeUsd: positionForTpSl.sizeInUsd,
      keepLeverage: true,
      triggerPrice: tpEntry.price.value,
      userReferralInfo,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      isLimit: true,
      limitPrice: triggerPrice ?? order.triggerPrice,
      triggerOrderType: OrderType.LimitDecrease,
      isSetAcceptablePriceImpactEnabled,
    });
  }, [
    isTpSlEnabled,
    positionForTpSl,
    order,
    tpEntry.price.value,
    minCollateralUsd,
    minPositionSizeUsd,
    userReferralInfo,
    uiFeeFactor,
    triggerPrice,
    isSetAcceptablePriceImpactEnabled,
  ]);

  const slDecreaseAmounts = useMemo(() => {
    if (
      !isTpSlEnabled ||
      !positionForTpSl ||
      !order ||
      typeof slEntry.price.value !== "bigint" ||
      minCollateralUsd === undefined ||
      minPositionSizeUsd === undefined
    ) {
      return undefined;
    }

    return getDecreasePositionAmounts({
      marketInfo: positionForTpSl.marketInfo,
      collateralToken: order.targetCollateralToken,
      isLong: order.isLong,
      position: positionForTpSl,
      closeSizeUsd: positionForTpSl.sizeInUsd,
      keepLeverage: true,
      triggerPrice: slEntry.price.value,
      userReferralInfo,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      isLimit: true,
      limitPrice: triggerPrice ?? order.triggerPrice,
      triggerOrderType: OrderType.StopLossDecrease,
      isSetAcceptablePriceImpactEnabled,
    });
  }, [
    isTpSlEnabled,
    positionForTpSl,
    order,
    slEntry.price.value,
    minCollateralUsd,
    minPositionSizeUsd,
    userReferralInfo,
    uiFeeFactor,
    triggerPrice,
    isSetAcceptablePriceImpactEnabled,
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

  const sidecarExecutionFee: SidecarExecutionFee | undefined = useMemo(() => {
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
    if (!isTpSlEnabled || !positionForTpSl || !order) {
      return [];
    }

    const entries = [
      {
        type: "tp" as const,
        entry: tpEntry,
        amounts: tpDecreaseAmounts,
        executionFee: tpExecutionFee,
      },
      {
        type: "sl" as const,
        entry: slEntry,
        amounts: slDecreaseAmounts,
        executionFee: slExecutionFee,
      },
    ].filter(
      (item) => typeof item.entry.price.value === "bigint" && !item.entry.price.error && item.amounts !== undefined
    );

    return entries.map((item, i) =>
      buildDecreaseOrderPayload({
        chainId: chainId as any,
        receiver: order.account,
        collateralDeltaAmount: item.amounts?.collateralDeltaAmount ?? 0n,
        collateralTokenAddress: order.targetCollateralToken.address,
        sizeDeltaUsd: item.amounts?.sizeDeltaUsd ?? 0n,
        sizeDeltaInTokens: item.amounts?.sizeDeltaInTokens ?? 0n,
        referralCode: userReferralInfo?.referralCodeForTxn,
        uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT,
        allowedSlippage: 0,
        orderType: item.amounts?.triggerOrderType ?? OrderType.LimitDecrease,
        autoCancel: i < autoCancelOrdersLimit,
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
  }, [
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
  ]);

  const hasTpSlValues = typeof tpPriceField.value === "bigint" || typeof slPriceField.value === "bigint";
  const tpSlHasError =
    isTpSlEnabled &&
    (!positionForTpSl ||
      Boolean(tpEntry.price.error) ||
      Boolean(slEntry.price.error) ||
      (!tpDecreaseAmounts && typeof tpPriceField.value === "bigint") ||
      (!slDecreaseAmounts && typeof slPriceField.value === "bigint"));
  const tpSlError =
    isTpSlEnabled && !hasTpSlValues
      ? t`Enter TP/SL price`
      : tpSlHasError
        ? t`There are issues in the TP/SL orders.`
        : undefined;

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
