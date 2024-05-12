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
  selectTradeboxMarkPrice,
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
import { SidecarOrderEntry, SidecarSlTpOrderEntryValid, SidecarLimitOrderEntry, SidecarSlTpOrderEntry } from "./types";

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

  const [maxLimitTrigerPrice, minLimitTrigerPrice] = useMemo(() => {
    const prices = existingLimits.reduce<BigNumber[]>(
      (acc, { price }) => (price.value ? [...acc, price.value] : acc),
      []
    );

    if (isLimit && triggerPrice) {
      prices.push(triggerPrice);
    }

    if (!prices.length) return [undefined, undefined];

    return prices.reduce(
      ([min, max], num) => [num.lt(min) ? num : min, num.gt(max) ? num : max],
      [prices[0], prices[0]]
    );
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
      if (!sizeUsd?.value || sizeUsd.error || !price?.value || price.error) return;

      if (!marketInfo || !mockPositionInfo || !swapRoute || !order) {
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
        findSwapPath: swapRoute.findSwapPath,
        userReferralInfo,
        uiFeeFactor,
        strategy: "independent",
      });
    },
    [marketInfo, mockPositionInfo, swapRoute, uiFeeFactor, userReferralInfo]
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
      totalPnL: BigNumber.from(0),
      totalPnLPercentage: BigNumber.from(0),
    };
  }, [getIncreaseAmountsFromEntry, limitEntriesInfo]);

  const canCalculatePnL = useMemo(() => {
    const displayableEntries = limit.entries.filter((e) => e.txnType !== "cancel");

    return !displayableEntries.length;
  }, [limit]);

  const mockPositionInfoWithLimits = useMemo(() => {
    if (!mockPositionInfo || !limit.entries.length) return mockPositionInfo;

    const [limitSummaryCollateralDeltaAmount, limitSummarySizeDeltaInTokens, limitSummarySizeDeltaUsd] =
      limit.entries.reduce(
        ([collateral, tokens, usd], entry) => [
          collateral.add(entry.increaseAmounts?.collateralDeltaAmount || 0),
          tokens.add(entry.increaseAmounts?.sizeDeltaInTokens || 0),
          usd.add(entry.increaseAmounts?.sizeDeltaUsd || 0),
        ],
        [BigNumber.from(0), BigNumber.from(0), BigNumber.from(0)]
      );

    return {
      ...mockPositionInfo,
      sizeInUsd: (mockPositionInfo?.sizeInUsd ?? BigNumber.from(0)).add(limitSummarySizeDeltaUsd ?? BigNumber.from(0)),
      sizeInTokens: (mockPositionInfo?.sizeInTokens ?? BigNumber.from(0)).add(
        limitSummarySizeDeltaInTokens ?? BigNumber.from(0)
      ),
      collateralAmount: (mockPositionInfo?.collateralAmount ?? BigNumber.from(0)).add(
        limitSummaryCollateralDeltaAmount ?? BigNumber.from(0)
      ),
    };
  }, [mockPositionInfo, limit.entries]);

  const getDecreaseAmountsFromEntry = useCallback(
    ({ sizeUsd, price }: SidecarOrderEntry) => {
      if (!sizeUsd?.value || sizeUsd.error || !price?.value || price.error || !marketInfo) return;

      if (
        !increaseAmounts ||
        !collateralToken ||
        !mockPositionInfoWithLimits ||
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
