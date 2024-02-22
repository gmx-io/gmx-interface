import {
  selectTradeboxTradeFlags,
  selectTradeboxState,
  selectTradeboxSelectedPosition,
  selectTradeboxExistingOrder,
  selectTradeboxLeverage,
  selectTradeboxFromTokenAddress,
  selectTradeboxToTokenAddress,
  selectTradeboxMarketAddress,
  selectTradeboxCollateralTokenAddress,
  selectTradeboxAvailableTokensOptions,
  selectTradeboxSetActivePosition,
  selectTradeboxTradeType,
  selectTradeboxSetToTokenAddress,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxSwapAmounts,
  selectTradeboxNextPositionValuesForIncrease,
  selectTradeboxNextPositionValuesForDecrease,
} from "../selectors/tradeboxSelectors";
import { useSelector } from "../utils";

export const useTradeboxTradeFlags = () => useSelector(selectTradeboxTradeFlags);
export const useTradeboxState = () => useSelector(selectTradeboxState);
export const useTradeboxSelectedPosition = () => useSelector(selectTradeboxSelectedPosition);
export const useTradeboxExistingOrder = () => useSelector(selectTradeboxExistingOrder);
export const useTradeboxLeverage = () => useSelector(selectTradeboxLeverage);
export const useTradeboxFromTokenAddress = () => useSelector(selectTradeboxFromTokenAddress);
export const useTradeboxToTokenAddress = () => useSelector(selectTradeboxToTokenAddress);
export const useTradeboxMarketAddress = () => useSelector(selectTradeboxMarketAddress);
export const useTradeboxCollateralAddress = () => useSelector(selectTradeboxCollateralTokenAddress);
export const useTradeboxAvailableTokensOptions = () => useSelector(selectTradeboxAvailableTokensOptions);
export const useTradeboxSetActivePosition = () => useSelector(selectTradeboxSetActivePosition);
export const useTradeboxTradeType = () => useSelector(selectTradeboxTradeType);
export const useTradeboxSetToTokenAddress = () => useSelector(selectTradeboxSetToTokenAddress);

export const useTradeboxSwapAmounts = () => useSelector(selectTradeboxSwapAmounts);
export const useTradeboxNextPositionValuesForIncrease = () => useSelector(selectTradeboxNextPositionValuesForIncrease);
export const useTradeboxNextPositionValuesForDecrease = () => useSelector(selectTradeboxNextPositionValuesForDecrease);
export const useTradeboxIncreasePositionAmounts = () => useSelector(selectTradeboxIncreasePositionAmounts);
export const useTradeboxDecreasePositionAmounts = () => useSelector(selectTradeboxDecreasePositionAmounts);
