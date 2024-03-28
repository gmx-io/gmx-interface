import { SyntheticsState } from "../SyntheticsStateContextProvider";
import { createSelector } from "../utils";

export const selectAccount = (s: SyntheticsState) => s.globals.account;
export const selectOrdersInfoData = (s: SyntheticsState) => s.globals.ordersInfo.ordersInfoData;
export const selectIsOrdersLoading = (s: SyntheticsState) => s.globals.ordersInfo.isLoading;
export const selectPositionsInfoData = (s: SyntheticsState) => s.globals.positionsInfo.positionsInfoData;
export const selectIsPositionsLoading = (s: SyntheticsState) => s.globals.positionsInfo.isLoading;
export const selectMarketsInfoData = (s: SyntheticsState) => s.globals.marketsInfo.marketsInfoData;
export const selectTokensData = (s: SyntheticsState) => s.globals.marketsInfo.tokensData;
export const selectPricesUpdatedAt = (s: SyntheticsState) => s.globals.marketsInfo.pricesUpdatedAt;
export const selectUiFeeFactor = (s: SyntheticsState) => s.globals.uiFeeFactor;
export const selectUserReferralInfo = (s: SyntheticsState) => s.globals.userReferralInfo;
export const selectChainId = (s: SyntheticsState) => s.globals.chainId;
export const selectSavedIsPnlInLeverage = (s: SyntheticsState) => s.globals.savedIsPnlInLeverage;
export const selectSavedShowPnlAfterFees = (s: SyntheticsState) => s.globals.savedShowPnlAfterFees;

export const selectMinCollateralUsd = (s: SyntheticsState) => s.globals.positionsConstants.minCollateralUsd;
export const selectMinPositionSizeUsd = (s: SyntheticsState) => s.globals.positionsConstants.minPositionSizeUsd;

export const selectClosingPositionKey = (s: SyntheticsState) => s.globals.closingPositionKey;
export const selectSetClosingPositionKey = (s: SyntheticsState) => s.globals.setClosingPositionKey;

export const selectPositionConstants = createSelector(
  [selectMinCollateralUsd, selectMinPositionSizeUsd],
  (minCollateralUsd, minPositionSizeUsd) => ({
    minCollateralUsd,
    minPositionSizeUsd,
  })
);

export const selectClosingPositionKeyState = createSelector(
  [selectClosingPositionKey, selectSetClosingPositionKey],
  (closingPositionKey, setClosingPositionKey) => [closingPositionKey, setClosingPositionKey] as const
);
