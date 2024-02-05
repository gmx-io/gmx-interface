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
  makeSelectTradeboxSwapAmounts,
  makeSelectTradeboxIncreasePositionAmounts,
  makeSelectTradeboxDecreasePositionAmounts,
  makeSelectTradeboxNextPositionValuesForIncrease,
  makeSelectTradeboxNextPositionValuesForDecrease,
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

// TODO this will work normally after PositionSeller and PositionEditor is migrated to global state
export const useTradeboxSwapAmounts = () => useSelector((s) => makeSelectTradeboxSwapAmounts(s)(s));
export const useTradeboxNextPositionValuesForIncrease = () =>
  useSelector((s) => makeSelectTradeboxNextPositionValuesForIncrease(s)(s));
export const useTradeboxNextPositionValuesForDecrease = () =>
  useSelector((s) => makeSelectTradeboxNextPositionValuesForDecrease(s)(s));
export const useTradeboxIncreasePositionAmounts = () =>
  useSelector((s) => makeSelectTradeboxIncreasePositionAmounts(s)(s));
export const useTradeboxDecreasePositionAmounts = () =>
  useSelector((s) => makeSelectTradeboxDecreasePositionAmounts(s)(s));
