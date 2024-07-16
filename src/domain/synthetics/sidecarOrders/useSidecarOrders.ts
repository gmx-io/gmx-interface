import { useCallback, useMemo } from "react";
import { getDecreasePositionAmounts, getIncreasePositionAmounts } from "domain/synthetics/trade";
import { convertToTokenAmount } from "../tokens";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  usePositionsConstants,
  useUiFeeFactor,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectTradeboxMarketInfo,
  selectTradeboxTradeFlags,
  selectTradeboxCollateralToken,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxTriggerPrice,
  selectTradeboxMarkPrice,
  selectTradeboxSelectedPosition,
  selectTradeboxNextPositionValues,
  selectTradeboxFindSwapPath,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import {
  selectConfirmationBoxSidecarOrdersExistingSlEntries,
  selectConfirmationBoxSidecarOrdersExistingTpEntries,
  selectConfirmationBoxSidecarOrdersExistingLimitEntries,
} from "context/SyntheticsStateContext/selectors/sidecarOrdersSelectors";
import { selectConfirmationBoxMockPosition } from "context/SyntheticsStateContext/selectors/confirmationBoxSelectors";
import { useSidecarOrdersGroup } from "./useSidecarOrdersGroup";
import { handleEntryError, getCommonError } from "./utils";
import { OrderType } from "domain/synthetics/orders/types";
import { SidecarOrderEntry, SidecarSlTpOrderEntryValid, SidecarLimitOrderEntry, SidecarSlTpOrderEntry } from "./types";

export * from "./types";

export function useSidecarOrders() {
  const userReferralInfo = useUserReferralInfo();
  const { minCollateralUsd, minPositionSizeUsd } = usePositionsConstants();
  const uiFeeFactor = useUiFeeFactor();

  const { isLong, isLimit } = useSelector(selectTradeboxTradeFlags);
  const findSwapPath = useSelector(selectTradeboxFindSwapPath);
  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const collateralToken = useSelector(selectTradeboxCollateralToken);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const triggerPrice = useSelector(selectTradeboxTriggerPrice);
  const markPrice = useSelector(selectTradeboxMarkPrice);
  const existingPosition = useSelector(selectTradeboxSelectedPosition);
  const nextPositionValues = useSelector(selectTradeboxNextPositionValues);

  const existingLimitOrderEntries = useSelector(selectConfirmationBoxSidecarOrdersExistingLimitEntries);
  const existingSlOrderEntries = useSelector(selectConfirmationBoxSidecarOrdersExistingSlEntries);
  const existingTpOrderEntries = useSelector(selectConfirmationBoxSidecarOrdersExistingTpEntries);

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

  const mockPositionInfo = useSelector(selectConfirmationBoxMockPosition);

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
        findSwapPath,
        userReferralInfo,
        uiFeeFactor,
        strategy: "independent",
      });
    },
    [marketInfo, mockPositionInfo, findSwapPath, uiFeeFactor, userReferralInfo]
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

  return {
    stopLoss,
    takeProfit,
    limit,
  };
}
