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
  selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
  selectTradeboxNextPositionValues,
  selectTradeboxNextLeverageWithoutPnl,
  selectTradeboxSetTradeConfig,
  selectTradeboxTradeMode,
  selectTradeboxChooseSuitableMarket,
  selectTradeboxGetMaxLongShortLiquidityPool,
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
export const useTradeboxTradeMode = () => useSelector(selectTradeboxTradeMode);
export const useTradeboxSetToTokenAddress = () => useSelector(selectTradeboxSetToTokenAddress);
export const useTradeboxSelectedTriggerAcceptablePriceImpactBps = () =>
  useSelector(selectTradeboxSelectedTriggerAcceptablePriceImpactBps);
export const useTradeboxSetTradeConfig = () => useSelector(selectTradeboxSetTradeConfig);

export const useTradeboxSwapAmounts = () => useSelector(selectTradeboxSwapAmounts);
export const useTradeboxNextPositionValuesForIncrease = () => useSelector(selectTradeboxNextPositionValuesForIncrease);
export const useTradeboxNextPositionValuesForDecrease = () => useSelector(selectTradeboxNextPositionValuesForDecrease);
export const useTradeboxIncreasePositionAmounts = () => useSelector(selectTradeboxIncreasePositionAmounts);
export const useTradeboxDecreasePositionAmounts = () => useSelector(selectTradeboxDecreasePositionAmounts);
export const useTradeboxNextPositionValues = () => useSelector(selectTradeboxNextPositionValues);
export const useTradeboxNextLeverageWithoutPnl = () => useSelector(selectTradeboxNextLeverageWithoutPnl);
export const useTradeboxChooseSuitableMarket = () => useSelector(selectTradeboxChooseSuitableMarket);
export const useTradeboxGetMaxLongShortLiquidityPool = () => useSelector(selectTradeboxGetMaxLongShortLiquidityPool);
