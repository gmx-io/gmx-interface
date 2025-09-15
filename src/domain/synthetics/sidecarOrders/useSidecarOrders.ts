import { useCallback, useEffect, useMemo } from "react";

import {
  usePositionsConstants,
  useUiFeeFactor,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChainId, selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxCollateralToken,
  selectTradeboxFindSwapPath,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxMarkPrice,
  selectTradeboxMarketInfo,
  selectTradeboxNextPositionValues,
  selectTradeboxSelectedPosition,
  selectTradeboxTradeFlags,
  selectTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import {
  selectTradeboxMockPosition,
  selectTradeboxSidecarEntriesSetIsUntouched,
  selectTradeboxSidecarOrdersExistingLimitEntries,
  selectTradeboxSidecarOrdersExistingSlEntries,
  selectTradeboxSidecarOrdersExistingTpEntries,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxSidecarOrders";
import { selectExternalSwapQuoteParams } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { OrderType } from "domain/synthetics/orders/types";
import { getDecreasePositionAmounts, getIncreasePositionAmounts } from "domain/synthetics/trade";
import { usePrevious } from "lib/usePrevious";

import { convertToTokenAmount } from "../tokens";
import { SidecarLimitOrderEntry, SidecarOrderEntry, SidecarSlTpOrderEntry, SidecarSlTpOrderEntryValid } from "./types";
import { useSidecarOrdersChanged } from "./useSidecarOrdersChanged";
import { useSidecarOrdersGroup } from "./useSidecarOrdersGroup";
import { getCommonError, handleEntryError } from "./utils";

export * from "./types";

export function useSidecarOrders() {
  const userReferralInfo = useUserReferralInfo();
  const { minCollateralUsd, minPositionSizeUsd } = usePositionsConstants();
  const uiFeeFactor = useUiFeeFactor();
  const setIsUntouched = useSelector(selectTradeboxSidecarEntriesSetIsUntouched);

  const { isLong, isLimit } = useSelector(selectTradeboxTradeFlags);
  const findSwapPath = useSelector(selectTradeboxFindSwapPath);
  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const collateralToken = useSelector(selectTradeboxCollateralToken);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const triggerPrice = useSelector(selectTradeboxTriggerPrice);
  const markPrice = useSelector(selectTradeboxMarkPrice);
  const existingPosition = useSelector(selectTradeboxSelectedPosition);
  const nextPositionValues = useSelector(selectTradeboxNextPositionValues);

  const existingLimitOrderEntries = useSelector(selectTradeboxSidecarOrdersExistingLimitEntries);
  const existingSlOrderEntries = useSelector(selectTradeboxSidecarOrdersExistingSlEntries);
  const existingTpOrderEntries = useSelector(selectTradeboxSidecarOrdersExistingTpEntries);

  const handleLimitErrors = useCallback(
    (entry: SidecarLimitOrderEntry) =>
      handleEntryError(entry, "limit", {
        liqPrice: nextPositionValues?.nextLiqPrice,
        triggerPrice,
        isExistingLimits: true,
        markPrice,
        isLong,
        isLimit,
      }),
    [isLong, isLimit, markPrice, triggerPrice, nextPositionValues]
  );

  const limitEntriesInfo = useSidecarOrdersGroup<SidecarLimitOrderEntry>({
    prefix: "limit",
    errorHandler: handleLimitErrors,
    initialEntries: existingLimitOrderEntries,
    canAddEntry: false,
    enablePercentage: false,
  });

  const existingLimits = useMemo(() => {
    return limitEntriesInfo.entries.filter((e) => e.txnType !== "cancel");
  }, [limitEntriesInfo.entries]);

  const [minLimitTrigerPrice, maxLimitTrigerPrice] = useMemo(() => {
    const prices = existingLimits.reduce<bigint[]>((acc, { price }) => (price.value ? [...acc, price.value] : acc), []);

    if (isLimit && triggerPrice !== undefined && triggerPrice !== null) {
      prices.push(triggerPrice);
    }

    if (!prices.length) return [undefined, undefined];

    return prices.reduce(([min, max], num) => [num < min ? num : min, num > max ? num : max], [prices[0], prices[0]]);
  }, [existingLimits, isLimit, triggerPrice]);

  const handleSLErrors = useCallback(
    (entry: SidecarSlTpOrderEntry) =>
      handleEntryError(entry, "sl", {
        liqPrice: nextPositionValues?.nextLiqPrice,
        triggerPrice,
        markPrice,
        isLong,
        isLimit,
        isExistingLimits: !!existingLimits.length,
        isExistingPosition: !!existingPosition,
        maxLimitTrigerPrice,
        minLimitTrigerPrice,
      }),
    [
      isLong,
      isLimit,
      triggerPrice,
      markPrice,
      existingPosition,
      nextPositionValues,
      maxLimitTrigerPrice,
      minLimitTrigerPrice,
      existingLimits,
    ]
  );

  const handleTPErrors = useCallback(
    (entry: SidecarSlTpOrderEntry) =>
      handleEntryError(entry, "tp", {
        liqPrice: nextPositionValues?.nextLiqPrice,
        triggerPrice,
        markPrice,
        isLong,
        isLimit,
        isExistingLimits: !!existingLimits.length,
        isExistingPosition: !!existingPosition,
        maxLimitTrigerPrice,
        minLimitTrigerPrice,
      }),
    [
      isLong,
      isLimit,
      triggerPrice,
      markPrice,
      existingPosition,
      nextPositionValues,
      maxLimitTrigerPrice,
      minLimitTrigerPrice,
      existingLimits,
    ]
  );

  const takeProfitEntriesInfo = useSidecarOrdersGroup<SidecarSlTpOrderEntry>({
    prefix: "tp",
    errorHandler: handleTPErrors,
    initialEntries: existingTpOrderEntries,
    enablePercentage: true,
  });
  const stopLossEntriesInfo = useSidecarOrdersGroup<SidecarSlTpOrderEntry>({
    prefix: "sl",
    errorHandler: handleSLErrors,
    initialEntries: existingSlOrderEntries,
    enablePercentage: true,
  });

  const mockPositionInfo = useSelector(selectTradeboxMockPosition);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const chainId = useSelector(selectChainId);
  const externalSwapQuoteParams = useSelector(selectExternalSwapQuoteParams);

  const getIncreaseAmountsFromEntry = useCallback(
    ({ sizeUsd, price, order }: SidecarOrderEntry) => {
      if (
        sizeUsd?.value === undefined ||
        sizeUsd?.value === null ||
        sizeUsd.error ||
        price?.value === undefined ||
        price?.value === null ||
        price.error
      )
        return;

      if (!marketInfo || !mockPositionInfo || !findSwapPath || !order) {
        return;
      }

      const size = convertToTokenAmount(sizeUsd.value, order.indexToken.decimals, price.value);

      return getIncreasePositionAmounts({
        marketInfo,
        indexToken: order.indexToken,
        collateralToken: order.targetCollateralToken,
        isLong: order.isLong,
        initialCollateralToken: order.initialCollateralToken,
        initialCollateralAmount: order.initialCollateralDeltaAmount,
        indexTokenAmount: size,
        triggerPrice: price.value,
        position: mockPositionInfo,
        externalSwapQuote: undefined,
        findSwapPath,
        userReferralInfo,
        uiFeeFactor,
        strategy: "independent",
        marketsInfoData,
        chainId,
        externalSwapQuoteParams,
      });
    },
    [
      marketInfo,
      mockPositionInfo,
      findSwapPath,
      uiFeeFactor,
      userReferralInfo,
      marketsInfoData,
      chainId,
      externalSwapQuoteParams,
    ]
  );

  const limit = useMemo(() => {
    const entries = limitEntriesInfo.entries.map((entry) => {
      return {
        ...entry,
        increaseAmounts: getIncreaseAmountsFromEntry(entry),
        decreaseAmounts: undefined,
      };
    });

    return {
      ...limitEntriesInfo,
      entries,
      totalPnL: 0n,
      totalPnLPercentage: 0n,
    };
  }, [getIncreaseAmountsFromEntry, limitEntriesInfo]);

  const canCalculatePnL = !existingLimits.length && (!isLimit || !existingPosition);

  const mockPositionInfoWithLimits = useMemo(() => {
    if (!mockPositionInfo || !limit.entries.length) return mockPositionInfo;

    const [limitSummaryCollateralDeltaAmount, limitSummarySizeDeltaInTokens, limitSummarySizeDeltaUsd] =
      limit.entries.reduce(
        ([collateral, tokens, usd], entry) => [
          collateral + (entry.increaseAmounts?.collateralDeltaAmount || 0n),
          tokens + (entry.increaseAmounts?.sizeDeltaInTokens || 0n),
          usd + (entry.increaseAmounts?.sizeDeltaUsd || 0n),
        ],
        [0n, 0n, 0n]
      );

    return {
      ...mockPositionInfo,
      sizeInUsd: (mockPositionInfo?.sizeInUsd ?? 0n) + (limitSummarySizeDeltaUsd ?? 0n),
      sizeInTokens: (mockPositionInfo?.sizeInTokens ?? 0n) + (limitSummarySizeDeltaInTokens ?? 0n),
      collateralAmount: (mockPositionInfo?.collateralAmount ?? 0n) + (limitSummaryCollateralDeltaAmount ?? 0n),
    };
  }, [mockPositionInfo, limit.entries]);

  const getDecreaseAmountsFromEntry = useCallback(
    ({ sizeUsd, price }: SidecarOrderEntry, triggerOrderType: OrderType.LimitDecrease | OrderType.StopLossDecrease) => {
      if (
        sizeUsd?.value === undefined ||
        sizeUsd?.value === null ||
        sizeUsd.error ||
        price?.value === undefined ||
        price?.value === null ||
        price.error ||
        !marketInfo
      )
        return;

      if (
        !increaseAmounts ||
        !collateralToken ||
        !mockPositionInfoWithLimits ||
        minPositionSizeUsd === undefined ||
        minCollateralUsd === undefined
      ) {
        return;
      }

      return getDecreasePositionAmounts({
        marketInfo,
        collateralToken,
        isLong,
        position: mockPositionInfoWithLimits,
        closeSizeUsd: sizeUsd.value,
        keepLeverage: true,
        triggerPrice: price.value,
        userReferralInfo,
        minCollateralUsd,
        minPositionSizeUsd,
        uiFeeFactor,
        isLimit,
        limitPrice: triggerPrice,
        triggerOrderType,
      });
    },
    [
      collateralToken,
      mockPositionInfoWithLimits,
      increaseAmounts,
      isLong,
      isLimit,
      marketInfo,
      triggerPrice,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      userReferralInfo,
    ]
  );

  const stopLoss = useMemo(() => {
    const entries = stopLossEntriesInfo.entries.map((entry) => {
      return {
        ...entry,
        decreaseAmounts: getDecreaseAmountsFromEntry(entry, OrderType.StopLossDecrease),
        increaseAmounts: undefined,
      };
    });

    const displayableEntries = entries.filter(
      (e): e is SidecarSlTpOrderEntryValid => !!e.decreaseAmounts && e.txnType !== "cancel"
    );

    let totalPnL, totalPnLPercentage;
    if (canCalculatePnL) {
      totalPnL = displayableEntries.reduce((acc, entry) => acc + (entry.decreaseAmounts?.realizedPnl || 0n), 0n);
      totalPnLPercentage = displayableEntries.reduce(
        (acc, entry) => acc + (entry.decreaseAmounts?.realizedPnlPercentage || 0n),
        0n
      );
    }

    return {
      ...stopLossEntriesInfo,
      entries,
      totalPnL,
      totalPnLPercentage,
      error: getCommonError(displayableEntries),
    };
  }, [getDecreaseAmountsFromEntry, stopLossEntriesInfo, canCalculatePnL]);

  const takeProfit = useMemo(() => {
    const entries = takeProfitEntriesInfo.entries.map((entry) => {
      return {
        ...entry,
        decreaseAmounts: getDecreaseAmountsFromEntry(entry, OrderType.LimitDecrease),
        increaseAmounts: undefined,
      };
    });

    const displayableEntries = entries.filter(
      (e): e is SidecarSlTpOrderEntryValid => !!e.decreaseAmounts && e.txnType !== "cancel"
    );

    let totalPnL, totalPnLPercentage;
    if (canCalculatePnL) {
      totalPnL = displayableEntries.reduce((acc, entry) => acc + (entry.decreaseAmounts?.realizedPnl || 0n), 0n);
      totalPnLPercentage = displayableEntries.reduce(
        (acc, entry) => acc + (entry.decreaseAmounts?.realizedPnlPercentage || 0n),
        0n
      );
    }

    return {
      ...takeProfitEntriesInfo,
      entries,
      totalPnL,
      totalPnLPercentage,
      error: getCommonError(displayableEntries),
    };
  }, [getDecreaseAmountsFromEntry, takeProfitEntriesInfo, canCalculatePnL]);

  const reset = useCallback(() => {
    limit.reset();
    stopLoss.reset();
    takeProfit.reset();
  }, [limit, stopLoss, takeProfit]);

  const doesEntriesChanged = useSidecarOrdersChanged();
  const prevDoesEntriesChanged = usePrevious(doesEntriesChanged);

  useEffect(() => {
    if (prevDoesEntriesChanged === false && doesEntriesChanged) {
      reset();
      /**
       * We need to reset the untouched state to false, to prevent next init on [./useSidecarOrdersGroup.ts#L115]
       * from UI perspective this prevents cursor focus loose without input change
       */
      setIsUntouched("limit", false);
      setIsUntouched("sl", false);
      setIsUntouched("tp", false);
    }
  }, [doesEntriesChanged, prevDoesEntriesChanged, reset, setIsUntouched]);

  return {
    stopLoss,
    takeProfit,
    limit,
    reset,
  };
}
