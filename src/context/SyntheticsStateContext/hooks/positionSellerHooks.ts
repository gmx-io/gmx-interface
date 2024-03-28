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

export const usePositionSellerDecreaseAmount = () => useSelector(selectPositionSellerDecreaseAmounts);

export const usePositionSellerKeepLeverage = () => useSelector(selectPositionSellerKeepLeverage);
export const usePositionSellerLeverageDisabledByCollateral = () =>
  useSelector(selectPositionSellerLeverageDisabledByCollateral);
