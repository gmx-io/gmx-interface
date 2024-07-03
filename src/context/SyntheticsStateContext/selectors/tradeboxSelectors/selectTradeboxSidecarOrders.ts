import { isLimitDecreaseOrderType, isLimitIncreaseOrderType, isStopLossOrderType } from "domain/synthetics/orders";
import {
  selectTradeboxCollateralToken,
  selectTradeboxMarketInfo,
  selectTradeboxNextPositionValues,
  selectTradeboxSelectedPositionKey,
  selectTradeboxTriggerPrice,
} from ".";

import { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { getPendingMockPosition } from "domain/synthetics/positions";
import { prepareInitialEntries } from "domain/synthetics/sidecarOrders/utils";
import { createSelector, createSelectorFactory } from "../../utils";
import { makeSelectOrdersByPositionKey } from "../orderSelectors";
import {
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxSelectedPosition,
  selectTradeboxTradeFlags,
} from "../tradeboxSelectors";

export const selectTradeboxExistingSlOrders = createSelector((q) => {
  const positionKey = q(selectTradeboxSelectedPositionKey);
  const positionOrders = q(makeSelectOrdersByPositionKey(positionKey));

  return positionOrders?.filter((order) => isStopLossOrderType(order.orderType));
});

export const selectTradeboxExistingTpOrders = createSelector((q) => {
  const positionKey = q(selectTradeboxSelectedPositionKey);
  const positionOrders = q(makeSelectOrdersByPositionKey(positionKey));

  return positionOrders?.filter((order) => isLimitDecreaseOrderType(order.orderType));
});

export const selectTradeboxExistingLimitOrders = createSelector((q) => {
  const positionKey = q(selectTradeboxSelectedPositionKey);
  const positionOrders = q(makeSelectOrdersByPositionKey(positionKey));

  return positionOrders?.filter((order) => isLimitIncreaseOrderType(order.orderType));
});

export const selectTradeboxSidecarOrdersSlEntries = (state: SyntheticsState) => state.tradebox.sidecarOrders.slEntries;
export const selectTradeboxSidecarOrdersSetSlEntries = (state: SyntheticsState) =>
  state.tradebox.sidecarOrders.setSlEntries;
export const selectTradeboxSidecarOrdersTpEntries = (state: SyntheticsState) => state.tradebox.sidecarOrders.tpEntries;
export const selectTradeboxSidecarOrdersSetTpEntries = (state: SyntheticsState) =>
  state.tradebox.sidecarOrders.setTpEntries;
export const selectTradeboxSidecarOrdersLimitEntries = (state: SyntheticsState) =>
  state.tradebox.sidecarOrders.limitEntries;
export const selectTradeboxSidecarOrdersSetLimitEntries = (state: SyntheticsState) =>
  state.tradebox.sidecarOrders.setLimitEntries;
export const selectTradeboxSidecarEntriesSetPristine = (state: SyntheticsState) =>
  state.tradebox.sidecarOrders.setPristine;

export const makeSelectTradeboxSidecarOrdersEntriesPristine = createSelectorFactory((group: "tp" | "sl" | "limit") =>
  createSelector(function selectSidecarOrdersEntriesPristineByGroup(q) {
    return {
      tp: () => q((state) => state.tradebox.sidecarOrders.tpEntriesPristine),
      sl: () => q((state) => state.tradebox.sidecarOrders.slEntriesPristine),
      limit: () => q((state) => state.tradebox.sidecarOrders.limitEntriesPristine),
    }[group]();
  })
);

// getters
export const makeSelectTradeboxSidecarOrdersEntries = createSelectorFactory((group: "tp" | "sl" | "limit") =>
  createSelector(function selectSidecarOrdersEntriesByGroup(q) {
    return {
      tp: () => q(selectTradeboxSidecarOrdersTpEntries),
      sl: () => q(selectTradeboxSidecarOrdersSlEntries),
      limit: () => q(selectTradeboxSidecarOrdersLimitEntries),
    }[group]();
  })
);

// setters
export const makeSelectTradeboxSidecarOrdersSetEntries = createSelectorFactory((group: "tp" | "sl" | "limit") =>
  createSelector(function selectSidecarOrdersEntriesByGroup(q) {
    return {
      tp: () => q(selectTradeboxSidecarOrdersSetTpEntries),
      sl: () => q(selectTradeboxSidecarOrdersSetSlEntries),
      limit: () => q(selectTradeboxSidecarOrdersSetLimitEntries),
    }[group]();
  })
);

export const makeSelectTradeboxSidecarOrdersState = createSelectorFactory((group: "tp" | "sl" | "limit") =>
  createSelector(function selectSidecarOrdersStateByGroup(q) {
    const entries = q(makeSelectTradeboxSidecarOrdersEntries(group));
    const setEntries = q(makeSelectTradeboxSidecarOrdersSetEntries(group));

    return [entries, setEntries] as const;
  })
);

export const makeSelectTradeboxSidecarOrdersTotalPercentage = createSelectorFactory((group: "tp" | "sl" | "limit") =>
  createSelector(function selectSidecarOrdersTotalPercentageByGroup(q) {
    const entries = q(makeSelectTradeboxSidecarOrdersEntries(group));

    return entries
      .filter((entry) => entry.txnType !== "cancel")
      .reduce<bigint>((total, entry) => (entry.percentage?.value ? total + entry.percentage.value : total), 0n);
  })
);

export const selectTradeboxSidecarOrdersTotalSizeUsd = createSelector((q) => {
  const existingPosition = q(selectTradeboxSelectedPosition);
  const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);
  const limitEntries = q(selectTradeboxSidecarOrdersLimitEntries);

  let result = 0n;

  if (existingPosition?.sizeInUsd !== undefined) {
    result = result + existingPosition?.sizeInUsd;
  }

  if (increaseAmounts?.sizeDeltaUsd !== undefined) {
    result = result + increaseAmounts?.sizeDeltaUsd;
  }

  limitEntries?.forEach((e) => {
    if (e.txnType !== "cancel") {
      result = result + (e.sizeUsd.value ?? 0n);
    }
  });

  return result;
});

export const selectTradeboxSidecarOrdersExistingSlEntries = createSelector((q) => {
  const existingSlOrders = q(selectTradeboxExistingSlOrders);
  const { isLong } = q(selectTradeboxTradeFlags);

  return prepareInitialEntries({ positionOrders: existingSlOrders, sort: isLong ? "desc" : "asc" });
});

export const selectTradeboxSidecarOrdersExistingTpEntries = createSelector((q) => {
  const existingTpOrders = q(selectTradeboxExistingTpOrders);
  const { isLong } = q(selectTradeboxTradeFlags);

  return prepareInitialEntries({ positionOrders: existingTpOrders, sort: isLong ? "asc" : "desc" });
});

export const selectTradeboxSidecarOrdersExistingLimitEntries = createSelector((q) => {
  const existingLimitOrders = q(selectTradeboxExistingLimitOrders);

  return prepareInitialEntries({ positionOrders: existingLimitOrders, sort: "desc" });
});

export const selectTradeboxMockPosition = createSelector((q) => {
  const positionKey = q(selectTradeboxSelectedPositionKey);
  const collateralToken = q(selectTradeboxCollateralToken);
  const marketInfo = q(selectTradeboxMarketInfo);
  const existingPosition = q(selectTradeboxSelectedPosition);
  const tradeFlags = q(selectTradeboxTradeFlags);
  const nextPositionValues = q(selectTradeboxNextPositionValues);
  const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);
  const triggerPrice = q(selectTradeboxTriggerPrice);

  if (!positionKey || !marketInfo || !collateralToken || !increaseAmounts || !nextPositionValues) return;

  const mockPosition = getPendingMockPosition({
    isIncrease: tradeFlags.isIncrease,
    positionKey,
    sizeDeltaUsd: (existingPosition?.sizeInUsd ?? 0n) + (increaseAmounts?.sizeDeltaUsd ?? 0n),
    sizeDeltaInTokens: (existingPosition?.sizeInTokens ?? 0n) + (increaseAmounts?.sizeDeltaInTokens ?? 0n),
    collateralDeltaAmount: (existingPosition?.collateralAmount ?? 0n) + (increaseAmounts?.collateralDeltaAmount ?? 0n),
    updatedAt: Date.now(),
    updatedAtBlock: 0n,
  });

  if (!mockPosition) return;

  return {
    ...mockPosition,
    marketInfo,
    indexToken: marketInfo.indexToken,
    collateralToken,
    pnlToken: tradeFlags.isLong ? marketInfo.longToken : marketInfo.shortToken,
    markPrice: nextPositionValues.nextEntryPrice!,
    entryPrice: nextPositionValues.nextEntryPrice,
    triggerPrice: tradeFlags.isLimit ? triggerPrice : undefined,
    liquidationPrice: nextPositionValues.nextLiqPrice,
    collateralUsd: increaseAmounts?.initialCollateralUsd,
    remainingCollateralUsd: increaseAmounts?.collateralDeltaUsd,
    remainingCollateralAmount: increaseAmounts?.collateralDeltaAmount,
    netValue: increaseAmounts?.collateralDeltaUsd,
    hasLowCollateral: false,
    leverage: nextPositionValues.nextLeverage,
    leverageWithPnl: nextPositionValues.nextLeverage,
    pnl: 0n,
    pnlPercentage: 0n,
    pnlAfterFees: 0n,
    pnlAfterFeesPercentage: 0n,
    closingFeeUsd: 0n,
    uiFeeUsd: 0n,
    pendingFundingFeesUsd: 0n,
    pendingClaimableFundingFeesUsd: 0n,
  };
});
