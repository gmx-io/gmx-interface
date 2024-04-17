import {
  selectPositionSeller,
  selectPositionSellerKeepLeverage,
  selectPositionSellerLeverageDisabledByCollateral,
} from "../selectors/positionSellerSelectors";
import { useSelector } from "../utils";

export const usePositionSeller = () => useSelector(selectPositionSeller);

export const usePositionSellerKeepLeverage = () => useSelector(selectPositionSellerKeepLeverage);
export const usePositionSellerLeverageDisabledByCollateral = () =>
  useSelector(selectPositionSellerLeverageDisabledByCollateral);
