import {
  selectPositionSeller,
  selectPositionSellerDecreaseAmounts,
  selectPositionSellerKeepLeverage,
  selectPositionSellerLeverageDisabledByCollateral,
  selectPositionSellerNextPositionValuesForDecrease,
  selectPositionSellerPosition,
} from "../selectors/positionSellerSelectors";
import { useSelector } from "../utils";

export const usePositionSeller = () => useSelector(selectPositionSeller);

export const usePositionSellerPosition = () => useSelector(selectPositionSellerPosition);

export const usePositionSellerNextPositionValuesForDecrease = () =>
  useSelector(selectPositionSellerNextPositionValuesForDecrease);

export const usePositionSellerDecreaseAmounts = () => useSelector(selectPositionSellerDecreaseAmounts);

export const usePositionSellerKeepLeverage = () => useSelector(selectPositionSellerKeepLeverage);
export const usePositionSellerLeverageDisabledByCollateral = () =>
  useSelector(selectPositionSellerLeverageDisabledByCollateral);
