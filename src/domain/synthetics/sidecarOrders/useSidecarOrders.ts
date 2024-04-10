import { useCallback, useMemo } from "react";
import { getDecreasePositionAmounts, getIncreasePositionAmounts } from "domain/synthetics/trade";
import { convertToTokenAmount } from "../tokens";
import { BigNumber } from "ethers";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  usePositionsConstants,
  useUiFeeFactor,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectTradeboxSwapRoutes,
  selectTradeboxMarketInfo,
  selectTradeboxTradeFlags,
  selectTradeboxCollateralToken,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxTriggerPrice,
  selectTradeboxSelectedPosition,
  selectTradeboxNextPositionValues,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import {
  selectConfirmationBoxSidecarOrdersExistingSlEntries,
  selectConfirmationBoxSidecarOrdersExistingTpEntries,
  selectConfirmationBoxSidecarOrdersExistingLimitEntries,
} from "context/SyntheticsStateContext/selectors/sidecarOrdersSelectors";
import { selectConfirmationBoxMockPosition } from "context/SyntheticsStateContext/selectors/confirmationBoxSelectors";
import { useSidecarOrdersGroup } from "./useSidecarOrdersGroup";
import { handleEntryError, getCommonError } from "./utils";
import {
  SidecarOrderEntry,
  SidecarLimitOrderEntryValid,
  SidecarSlTpOrderEntryValid,
  SidecarLimitOrderEntry,
  SidecarSlTpOrderEntry,
} from "./types";

export * from "./types";

export function useSidecarOrders() {
  const userReferralInfo = useUserReferralInfo();
  const { minCollateralUsd, minPositionSizeUsd } = usePositionsConstants();
  const uiFeeFactor = useUiFeeFactor();

  const { isLong, isLimit } = useSelector(selectTradeboxTradeFlags);
  const swapRoute = useSelector(selectTradeboxSwapRoutes);
  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const collateralToken = useSelector(selectTradeboxCollateralToken);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const triggerPrice = useSelector(selectTradeboxTriggerPrice);
  const existingPosition = useSelector(selectTradeboxSelectedPosition);
  const nextPositionValues = useSelector(selectTradeboxNextPositionValues);

  const existingLimitOrderEntries = useSelector(selectConfirmationBoxSidecarOrdersExistingLimitEntries);
  const existingSlOrderEntries = useSelector(selectConfirmationBoxSidecarOrdersExistingSlEntries);
  const existingTpOrderEntries = useSelector(selectConfirmationBoxSidecarOrdersExistingTpEntries);

  const handleLimitErrors = useCallback(
    (entry: SidecarLimitOrderEntry) =>
      handleEntryError(entry, "limit", {
        liqPrice: nextPositionValues?.nextLiqPrice,
        entryPrice: isLimit ? triggerPrice : nextPositionValues?.nextEntryPrice,
        isLong,
        isLimit,
      }),
    [isLong, isLimit, triggerPrice, nextPositionValues]
  );

  const limitEntriesInfo = useSidecarOrdersGroup<SidecarLimitOrderEntry>({
    prefix: "limit",
    errorHandler: handleLimitErrors,
    initialEntries: existingLimitOrderEntries,
    canAddEntry: false,
  });

  const [maxLimitTrigerPrice, minLimitTrigerPrice] = useMemo(() => {
    const prices = limitEntriesInfo.entries.reduce<BigNumber[]>(
      (acc, { price }) => (price.value ? [...acc, price.value] : acc),
      []
    );

    if (!prices.length) return [undefined, undefined];

    return prices.reduce(
      ([min, max], num) => [num.lt(min) ? num : min, num.gt(max) ? num : max],
      [prices[0], prices[0]]
    );
  }, [limitEntriesInfo.entries]);

  const handleSLErrors = useCallback(
    (entry: SidecarSlTpOrderEntry) =>
      handleEntryError(entry, "sl", {
        liqPrice: nextPositionValues?.nextLiqPrice,
        entryPrice: isLimit ? triggerPrice : nextPositionValues?.nextEntryPrice,
        isLong,
        isLimit,
        isAnyLimits: !!limitEntriesInfo.entries.length || isLimit,
        isExistingPosition: !!existingPosition,
        maxLimitTrigerPrice,
        minLimitTrigerPrice,
      }),
    [
      isLong,
      isLimit,
      triggerPrice,
      existingPosition,
      nextPositionValues,
      maxLimitTrigerPrice,
      minLimitTrigerPrice,
      limitEntriesInfo.entries.length,
    ]
  );

  const handleTPErrors = useCallback(
    (entry: SidecarSlTpOrderEntry) =>
      handleEntryError(entry, "tp", {
        liqPrice: nextPositionValues?.nextLiqPrice,
        entryPrice: isLimit ? triggerPrice : nextPositionValues?.nextEntryPrice,
        isLong,
        isLimit,
        isAnyLimits: !!limitEntriesInfo.entries.length || isLimit,
        isExistingPosition: !!existingPosition,
        maxLimitTrigerPrice,
        minLimitTrigerPrice,
      }),
    [
      isLong,
      isLimit,
      triggerPrice,
      existingPosition,
      nextPositionValues,
      maxLimitTrigerPrice,
      minLimitTrigerPrice,
      limitEntriesInfo.entries.length,
    ]
  );

  const takeProfitEntriesInfo = useSidecarOrdersGroup<SidecarSlTpOrderEntry>({
    prefix: "tp",
    errorHandler: handleTPErrors,
    initialEntries: existingTpOrderEntries,
  });
  const stopLossEntriesInfo = useSidecarOrdersGroup<SidecarSlTpOrderEntry>({
    prefix: "sl",
    errorHandler: handleSLErrors,
    initialEntries: existingSlOrderEntries,
  });

  const mockPositionInfo = useSelector(selectConfirmationBoxMockPosition);

  const getDecreaseAmountsFromEntry = useCallback(
    ({ sizeUsd, price }: SidecarOrderEntry) => {
      if (!sizeUsd?.value || sizeUsd.error || !price?.value || price.error || !marketInfo) return;

      if (
        !increaseAmounts ||
        !collateralToken ||
        !mockPositionInfo ||
        !minPositionSizeUsd ||
        !minCollateralUsd ||
        !sizeUsd?.value
      ) {
        return;
      }

      return getDecreasePositionAmounts({
        marketInfo,
        collateralToken,
        isLong,
        position: mockPositionInfo,
        closeSizeUsd: sizeUsd.value,
        keepLeverage: true,
        triggerPrice: price.value,
        userReferralInfo,
        minCollateralUsd,
        minPositionSizeUsd,
        uiFeeFactor,
        isLimit,
        limitPrice: triggerPrice,
      });
    },
    [
      collateralToken,
      mockPositionInfo,
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

  const getIncreaseAmountsFromEntry = useCallback(
    ({ sizeUsd, price, order }: SidecarOrderEntry) => {
      if (!sizeUsd?.value || sizeUsd.error || !price?.value || price.error) return;

      const size = convertToTokenAmount(sizeUsd.value, order?.indexToken.decimals, increaseAmounts?.indexPrice);

      if (!marketInfo || !collateralToken || !mockPositionInfo || !swapRoute || !order) {
        return;
      }

      return getIncreasePositionAmounts({
        marketInfo,
        indexToken: order.indexToken,
        initialCollateralToken: order.initialCollateralToken,
        collateralToken,
        isLong,
        initialCollateralAmount: order.initialCollateralDeltaAmount,
        indexTokenAmount: size,
        leverage: mockPositionInfo?.leverage,
        triggerPrice: price.value,
        position: mockPositionInfo,
        findSwapPath: swapRoute.findSwapPath,
        userReferralInfo,
        uiFeeFactor,
        strategy: "independent",
      });
    },
    [collateralToken, increaseAmounts, isLong, marketInfo, mockPositionInfo, swapRoute, uiFeeFactor, userReferralInfo]
  );

  const limit = useMemo(() => {
    const entries = limitEntriesInfo.entries.map((entry) => {
      return {
        ...entry,
        increaseAmounts: getIncreaseAmountsFromEntry(entry),
        decreaseAmounts: undefined,
      };
    });

    const displayableEntries = entries.filter(
      (e): e is SidecarLimitOrderEntryValid => e.txnType !== "cancel" && !!e.increaseAmounts
    );

    return {
      ...limitEntriesInfo,
      entries,
      totalPnL: BigNumber.from(0),
      totalPnLPercentage: BigNumber.from(0),
      error: getCommonError(displayableEntries),
    };
  }, [getIncreaseAmountsFromEntry, limitEntriesInfo]);

  const canCalculatePnL = !limit.entries.length;

  const stopLoss = useMemo(() => {
    const entries = stopLossEntriesInfo.entries.map((entry) => {
      return {
        ...entry,
        decreaseAmounts: getDecreaseAmountsFromEntry(entry),
        increaseAmounts: undefined,
      };
    });

    const displayableEntries = entries.filter(
      (e): e is SidecarSlTpOrderEntryValid => !!e.decreaseAmounts && e.txnType !== "cancel"
    );

    let totalPnL, totalPnLPercentage;
    if (canCalculatePnL) {
      totalPnL = displayableEntries.reduce(
        (acc, entry) => acc.add(entry.decreaseAmounts?.realizedPnl || 0),
        BigNumber.from(0)
      );
      totalPnLPercentage = displayableEntries.reduce(
        (acc, entry) => acc.add(entry.decreaseAmounts?.realizedPnlPercentage || 0),
        BigNumber.from(0)
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
        decreaseAmounts: getDecreaseAmountsFromEntry(entry),
        increaseAmounts: undefined,
      };
    });

    const displayableEntries = entries.filter(
      (e): e is SidecarSlTpOrderEntryValid => !!e.decreaseAmounts && e.txnType !== "cancel"
    );

    let totalPnL, totalPnLPercentage;
    if (canCalculatePnL) {
      totalPnL = displayableEntries.reduce(
        (acc, entry) => acc.add(entry.decreaseAmounts?.realizedPnl || 0),
        BigNumber.from(0)
      );
      totalPnLPercentage = displayableEntries.reduce(
        (acc, entry) => acc.add(entry.decreaseAmounts?.realizedPnlPercentage || 0),
        BigNumber.from(0)
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
