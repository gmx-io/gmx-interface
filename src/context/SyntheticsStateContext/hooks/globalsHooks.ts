import {
  selectAccount,
  selectClosingPositionKeyState,
  selectIsOrdersLoading,
  selectIsPositionsLoading,
  selectMarketsInfoData,
  selectOrdersInfoData,
  selectPositionConstants,
  selectPositionsInfoData,
  selectPricesUpdatedAt,
  selectTokensData,
  selectUiFeeFactor,
  selectUserReferralInfo,
} from "../selectors/globalSelectors";
import { useSelector } from "../utils";

export const useMarketsInfoData = () => useSelector(selectMarketsInfoData);
export const useTokensData = () => useSelector(selectTokensData);
export const useOrdersInfoData = () => useSelector(selectOrdersInfoData);
export const useIsOrdersLoading = () => useSelector(selectIsOrdersLoading);
export const usePricesUpdatedAt = () => useSelector(selectPricesUpdatedAt);
export const useUserReferralInfo = () => useSelector(selectUserReferralInfo);
export const usePositionsInfoData = () => useSelector(selectPositionsInfoData);
export const useIsPositionsLoading = () => useSelector(selectIsPositionsLoading);
export const useUiFeeFactor = () => useSelector(selectUiFeeFactor);

export const usePositionsConstants = () => useSelector(selectPositionConstants);

export const useClosingPositionKeyState = () => useSelector(selectClosingPositionKeyState);
export const useAccount = () => useSelector(selectAccount);
