import { useCallback, useEffect, useMemo } from "react";

import {
  usePositionsConstants,
  useUiFeeFactor,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectIsSetAcceptablePriceImpactEnabled } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import {
  selectTradeboxNextPositionValues,
  selectTradeboxSelectedPosition,
  selectTradeboxTradeFlags,
  selectTradeboxTriggerPrice,
  selectTradeboxMarkPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import {
  selectTradeboxMockPosition,
  selectTradeboxSidecarEntriesSetIsUntouched,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxSidecarOrders";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { OrderType } from "domain/synthetics/orders/types";
import { getTpSlDecreaseAmounts } from "domain/tpsl/sidecar";
import { usePrevious } from "lib/usePrevious";

import { SidecarSlTpOrderEntry, SidecarSlTpOrderEntryValid } from "./types";
import { useSidecarOrdersChanged } from "./useSidecarOrdersChanged";
import { useSidecarOrdersGroup } from "./useSidecarOrdersGroup";
import { getCommonError, handleEntryError } from "./utils";

export * from "./types";

export function useSidecarOrders() {
  const userReferralInfo = useUserReferralInfo();
  const { minCollateralUsd, minPositionSizeUsd } = usePositionsConstants();
  const uiFeeFactor = useUiFeeFactor();
  const setIsUntouched = useSelector(selectTradeboxSidecarEntriesSetIsUntouched);
  const isSetAcceptablePriceImpactEnabled = useSelector(selectIsSetAcceptablePriceImpactEnabled);

  const { isLong, isLimit } = useSelector(selectTradeboxTradeFlags);
  const triggerPrice = useSelector(selectTradeboxTriggerPrice);
  const markPrice = useSelector(selectTradeboxMarkPrice);
  const existingPosition = useSelector(selectTradeboxSelectedPosition);
  const nextPositionValues = useSelector(selectTradeboxNextPositionValues);
  const mockPositionInfo = useSelector(selectTradeboxMockPosition);

  const handleSLErrors = useCallback(
    (entry: SidecarSlTpOrderEntry) =>
      handleEntryError(entry, "sl", {
        liqPrice: nextPositionValues?.nextLiqPrice,
        triggerPrice,
        markPrice,
        isLong,
        isLimit,
        isExistingPosition: !!existingPosition,
      }),
    [isLong, isLimit, triggerPrice, markPrice, existingPosition, nextPositionValues]
  );

  const handleTPErrors = useCallback(
    (entry: SidecarSlTpOrderEntry) =>
      handleEntryError(entry, "tp", {
        liqPrice: nextPositionValues?.nextLiqPrice,
        triggerPrice,
        markPrice,
        isLong,
        isLimit,
        isExistingPosition: !!existingPosition,
      }),
    [isLong, isLimit, triggerPrice, markPrice, existingPosition, nextPositionValues]
  );

  const takeProfitEntriesInfo = useSidecarOrdersGroup<SidecarSlTpOrderEntry>({
    prefix: "tp",
    errorHandler: handleTPErrors,
    canAddEntry: false,
    enablePercentage: true,
  });

  const stopLossEntriesInfo = useSidecarOrdersGroup<SidecarSlTpOrderEntry>({
    prefix: "sl",
    errorHandler: handleSLErrors,
    canAddEntry: false,
    enablePercentage: true,
  });

  const getDecreaseAmountsFromEntry = useCallback(
    (
      { sizeUsd, price }: SidecarSlTpOrderEntry,
      triggerOrderType: OrderType.LimitDecrease | OrderType.StopLossDecrease
    ) => {
      if (
        sizeUsd?.value === undefined ||
        sizeUsd?.value === null ||
        sizeUsd.error ||
        price?.value === undefined ||
        price?.value === null ||
        price.error ||
        !mockPositionInfo ||
        minPositionSizeUsd === undefined ||
        minCollateralUsd === undefined
      ) {
        return;
      }

      return getTpSlDecreaseAmounts({
        position: mockPositionInfo,
        closeSizeUsd: sizeUsd.value,
        triggerPrice: price.value,
        triggerOrderType,
        isLimit,
        limitPrice: triggerPrice,
        minCollateralUsd,
        minPositionSizeUsd,
        uiFeeFactor,
        userReferralInfo,
        isSetAcceptablePriceImpactEnabled,
      });
    },
    [
      isLimit,
      minCollateralUsd,
      minPositionSizeUsd,
      mockPositionInfo,
      triggerPrice,
      uiFeeFactor,
      userReferralInfo,
      isSetAcceptablePriceImpactEnabled,
    ]
  );

  const canCalculatePnL = !isLimit || !existingPosition;

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
    stopLoss.reset();
    takeProfit.reset();
  }, [stopLoss, takeProfit]);

  const doesEntriesChanged = useSidecarOrdersChanged();
  const prevDoesEntriesChanged = usePrevious(doesEntriesChanged);

  useEffect(() => {
    if (prevDoesEntriesChanged === false && doesEntriesChanged) {
      reset();
      setIsUntouched("sl", false);
      setIsUntouched("tp", false);
    }
  }, [doesEntriesChanged, prevDoesEntriesChanged, reset, setIsUntouched]);

  return {
    stopLoss,
    takeProfit,
    reset,
  };
}
