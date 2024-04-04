import { SyntheticsTradeState } from "../SyntheticsStateContextProvider";
import { createSelector } from "../utils";

export const selectAccount = (s: SyntheticsTradeState) => s.globals.account;
export const selectOrdersInfoData = (s: SyntheticsTradeState) => s.globals.ordersInfo.ordersInfoData;
export const selectIsOrdersLoading = (s: SyntheticsTradeState) => s.globals.ordersInfo.isLoading;
export const selectPositionsInfoData = (s: SyntheticsTradeState) => s.globals.positionsInfo.positionsInfoData;
export const selectIsPositionsLoading = (s: SyntheticsTradeState) => s.globals.positionsInfo.isLoading;
export const selectMarketsInfoData = (s: SyntheticsTradeState) => s.globals.marketsInfo.marketsInfoData;
export const selectTokensData = (s: SyntheticsTradeState) => s.globals.marketsInfo.tokensData;
export const selectPricesUpdatedAt = (s: SyntheticsTradeState) => s.globals.marketsInfo.pricesUpdatedAt;
export const selectUiFeeFactor = (s: SyntheticsTradeState) => s.globals.uiFeeFactor;
export const selectUserReferralInfo = (s: SyntheticsTradeState) => s.globals.userReferralInfo;
export const selectChainId = (s: SyntheticsTradeState) => s.globals.chainId;
export const selectSavedIsPnlInLeverage = (s: SyntheticsTradeState) => s.globals.savedIsPnlInLeverage;
export const selectSavedShowPnlAfterFees = (s: SyntheticsTradeState) => s.globals.savedShowPnlAfterFees;

export const selectMinCollateralUsd = (s: SyntheticsTradeState) => s.globals.positionsConstants.minCollateralUsd;
export const selectMinPositionSizeUsd = (s: SyntheticsTradeState) => s.globals.positionsConstants.minPositionSizeUsd;

export const selectClosingPositionKey = (s: SyntheticsTradeState) => s.globals.closingPositionKey;
export const selectSetClosingPositionKey = (s: SyntheticsTradeState) => s.globals.setClosingPositionKey;

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
