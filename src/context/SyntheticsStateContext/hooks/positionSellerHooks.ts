import {
  selectPositionSeller,
  selectPositionSellerAllowedSlippage,
  selectPositionSellerCloseUsdInputValue,
  selectPositionSellerDecreaseAmounts,
  selectPositionSellerDecreaseAmountsWithKeepLeverage,
  selectPositionSellerDefaultTriggerAcceptablePriceImpactBps,
  selectPositionSellerIsSubmitting,
  selectPositionSellerKeepLeverage,
  selectPositionSellerNextPositionValuesForDecrease,
  selectPositionSellerNextPositionValuesForDecreaseWithoutKeepLeverage,
  selectPositionSellerOrderOption,
  selectPositionSellerPosition,
  selectPositionSellerReceiveTokenAddress,
  selectPositionSellerSelectedTriggerAcceptablePriceImpactBps,
  selectPositionSellerTriggerPriceInputValue,
} from "../selectors/positionSellerSelectors";
import { useSelector } from "../utils";

export const usePositionSeller = () => useSelector(selectPositionSeller);

export const usePositionSellerOrderOption = () => useSelector(selectPositionSellerOrderOption);
export const usePositionSellerTriggerPriceInputValue = () => useSelector(selectPositionSellerTriggerPriceInputValue);
export const usePositionSellerKeepLeverage = () => useSelector(selectPositionSellerKeepLeverage);
export const usePositionSellerDefaultTriggerAcceptablePriceImpactBps = () =>
  useSelector(selectPositionSellerDefaultTriggerAcceptablePriceImpactBps);
export const usePositionSellerSelectedTriggerAcceptablePriceImpactBps = () =>
  useSelector(selectPositionSellerSelectedTriggerAcceptablePriceImpactBps);
export const usePositionSellerCloseUsdInputValue = () => useSelector(selectPositionSellerCloseUsdInputValue);
export const usePositionSellerReceiveTokenAddress = () => useSelector(selectPositionSellerReceiveTokenAddress);
export const usePositionSellerAllowedSlippage = () => useSelector(selectPositionSellerAllowedSlippage);
export const usePositionSellerIsSubmitting = () => useSelector(selectPositionSellerIsSubmitting);

export const usePositionSellerPosition = () => useSelector(selectPositionSellerPosition);

export const usePositionSellerNextPositionValuesForDecrease = () =>
  useSelector(selectPositionSellerNextPositionValuesForDecrease);
export const usePositionSellerNextPositionValuesForDecreaseWithoutKeepLeverage = () =>
  useSelector(selectPositionSellerNextPositionValuesForDecreaseWithoutKeepLeverage);
export const usePositionSellerDecreaseAmount = () => useSelector(selectPositionSellerDecreaseAmounts);
export const usePositionSellerDecreaseAmountWithKeepLeverage = () =>
  useSelector(selectPositionSellerDecreaseAmountsWithKeepLeverage);
