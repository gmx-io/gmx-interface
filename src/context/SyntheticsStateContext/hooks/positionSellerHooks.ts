import {
  selectPositionSeller,
  selectPositionSellerDecreaseAmounts,
  selectPositionSellerDecreaseAmountsWithKeepLeverage,
  selectPositionSellerKeepLeverage,
  selectPositionSellerLeverageDisabledByCollateral,
  selectPositionSellerNextPositionValuesForDecrease,
  selectPositionSellerNextPositionValuesForDecreaseWithoutKeepLeverage,
  selectPositionSellerPosition,
} from "../selectors/positionSellerSelectors";
import { useSelector } from "../utils";

export const usePositionSeller = () => useSelector(selectPositionSeller);

export const usePositionSellerPosition = () => useSelector(selectPositionSellerPosition);

export const usePositionSellerNextPositionValuesForDecrease = () =>
  useSelector(selectPositionSellerNextPositionValuesForDecrease);
export const usePositionSellerNextPositionValuesForDecreaseWithoutKeepLeverage = () =>
  useSelector(selectPositionSellerNextPositionValuesForDecreaseWithoutKeepLeverage);
export const usePositionSellerDecreaseAmount = () => useSelector(selectPositionSellerDecreaseAmounts);
export const usePositionSellerDecreaseAmountWithKeepLeverage = () =>
  useSelector(selectPositionSellerDecreaseAmountsWithKeepLeverage);

export const usePositionSellerKeepLeverage = () => useSelector(selectPositionSellerKeepLeverage);
export const usePositionSellerLeverageDisabledByCollateral = () =>
  useSelector(selectPositionSellerLeverageDisabledByCollateral);
