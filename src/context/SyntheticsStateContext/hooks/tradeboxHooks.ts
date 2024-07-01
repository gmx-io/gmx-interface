import {
  selectTradeboxAdvancedOptions,
  selectTradeboxAvailableTokensOptions,
  selectTradeboxChooseSuitableMarket,
  selectTradeboxCollateralToken,
  selectTradeboxCollateralTokenAddress,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxDefaultTriggerAcceptablePriceImpactBps,
  selectTradeboxExistingOrder,
  selectTradeboxFees,
  selectTradeboxFromTokenAddress,
  selectTradeboxGetMaxLongShortLiquidityPool,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxLeverage,
  selectTradeboxLiquidity,
  selectTradeboxMarketAddress,
  selectTradeboxMarketInfo,
  selectTradeboxMaxLiquidityPath,
  selectTradeboxNextLeverageWithoutPnl,
  selectTradeboxNextPositionValues,
  selectTradeboxNextPositionValuesForDecrease,
  selectTradeboxNextPositionValuesForIncrease,
  selectTradeboxSelectedPosition,
  selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
  selectTradeboxSetActivePosition,
  selectTradeboxSetAdvancedOptions,
  selectTradeboxSetSelectedAcceptablePriceImpactBps,
  selectTradeboxSetToTokenAddress,
  selectTradeboxSetTradeConfig,
  selectTradeboxState,
  selectTradeboxSwapAmounts,
  selectTradeboxToTokenAddress,
  selectTradeboxTradeFlags,
  selectTradeboxTradeMode,
  selectTradeboxTradeType,
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
export const useTradeboxCollateralToken = () => useSelector(selectTradeboxCollateralToken);
export const useTradeboxAvailableTokensOptions = () => useSelector(selectTradeboxAvailableTokensOptions);
export const useTradeboxSetActivePosition = () => useSelector(selectTradeboxSetActivePosition);
export const useTradeboxTradeType = () => useSelector(selectTradeboxTradeType);
export const useTradeboxTradeMode = () => useSelector(selectTradeboxTradeMode);
export const useTradeboxSetToTokenAddress = () => useSelector(selectTradeboxSetToTokenAddress);
export const useTradeboxSelectedTriggerAcceptablePriceImpactBps = () =>
  useSelector(selectTradeboxSelectedTriggerAcceptablePriceImpactBps);
export const useTradeboxDefaultTriggerAcceptablePriceImpactBps = () =>
  useSelector(selectTradeboxDefaultTriggerAcceptablePriceImpactBps);
export const useTradeboxSetSelectedAcceptablePriceImpactBps = () =>
  useSelector(selectTradeboxSetSelectedAcceptablePriceImpactBps);
export const useTradeboxSetTradeConfig = () => useSelector(selectTradeboxSetTradeConfig);
export const useTradeboxMarketInfo = () => useSelector(selectTradeboxMarketInfo);
export const useTradeboxFees = () => useSelector(selectTradeboxFees);
export const useTradeboxSwapAmounts = () => useSelector(selectTradeboxSwapAmounts);
export const useTradeboxNextPositionValuesForIncrease = () => useSelector(selectTradeboxNextPositionValuesForIncrease);
export const useTradeboxNextPositionValuesForDecrease = () => useSelector(selectTradeboxNextPositionValuesForDecrease);
export const useTradeboxIncreasePositionAmounts = () => useSelector(selectTradeboxIncreasePositionAmounts);
export const useTradeboxDecreasePositionAmounts = () => useSelector(selectTradeboxDecreasePositionAmounts);
export const useTradeboxNextPositionValues = () => useSelector(selectTradeboxNextPositionValues);
export const useTradeboxNextLeverageWithoutPnl = () => useSelector(selectTradeboxNextLeverageWithoutPnl);
export const useTradeboxChooseSuitableMarket = () => useSelector(selectTradeboxChooseSuitableMarket);
export const useTradeboxGetMaxLongShortLiquidityPool = () => useSelector(selectTradeboxGetMaxLongShortLiquidityPool);

export const useTradeboxAdvancedOptions = () => useSelector(selectTradeboxAdvancedOptions);
export const useTradeboxSetAdvancedOptions = () => useSelector(selectTradeboxSetAdvancedOptions);
export const useTradeboxLiquidity = () => useSelector(selectTradeboxLiquidity);
export const useTradeboxMaxLiquidityPath = () => useSelector(selectTradeboxMaxLiquidityPath);
