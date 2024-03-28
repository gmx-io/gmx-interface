import {
  selectMarketsInfoData,
  selectTokensData,
  selectOrdersInfoData,
  selectIsOrdersLoading,
  selectPricesUpdatedAt,
  selectUserReferralInfo,
  selectSavedIsPnlInLeverage,
  selectSavedShowPnlAfterFees,
  selectPositionsInfoData,
  selectIsPositionsLoading,
  selectUiFeeFactor,
  selectPositionConstants,
  selectClosingPositionKeyState,
  selectAccount,
} from "../selectors/globalSelectors";
import { useSelector } from "../utils";

export const useMarketsInfoData = () => useSelector(selectMarketsInfoData);
export const useTokensData = () => useSelector(selectTokensData);
export const useOrdersInfoData = () => useSelector(selectOrdersInfoData);
export const useIsOrdersLoading = () => useSelector(selectIsOrdersLoading);
export const usePricesUpdatedAt = () => useSelector(selectPricesUpdatedAt);
export const useUserReferralInfo = () => useSelector(selectUserReferralInfo);
export const useSavedIsPnlInLeverage = () => useSelector(selectSavedIsPnlInLeverage);
export const useSavedShowPnlAfterFees = () => useSelector(selectSavedShowPnlAfterFees);
export const usePositionsInfoData = () => useSelector(selectPositionsInfoData);
export const useIsPositionsLoading = () => useSelector(selectIsPositionsLoading);
export const useUiFeeFactor = () => useSelector(selectUiFeeFactor);

export const usePositionsConstants = () => useSelector(selectPositionConstants);

export const useClosingPositionKeyState = () => useSelector(selectClosingPositionKeyState);
export const useAccount = () => useSelector(selectAccount);
