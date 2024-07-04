import { getByKey } from "lib/objects";
import {
  selectTradeboxAdvancedOptions,
  selectTradeboxAvailableTokensOptions,
  selectTradeboxChooseSuitableMarket,
  selectTradeboxCollateralToken,
  selectTradeboxCollateralTokenAddress,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxDefaultTriggerAcceptablePriceImpactBps,
  selectTradeboxExecutionFee,
  selectTradeboxExistingOrder,
  selectTradeboxFees,
  selectTradeboxFromTokenAddress,
  selectTradeboxGetMaxLongShortLiquidityPool,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxIsWrapOrUnwrap,
  selectTradeboxLeverage,
  selectTradeboxLiquidity,
  selectTradeboxMarkPrice,
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
  selectTradeboxTriggerPrice,
} from "../selectors/tradeboxSelectors";
import { useSelector } from "../utils";
import { useTokensData } from "./globalsHooks";

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

export const useTradeboxSetAdvancedOptions = () => useSelector(selectTradeboxSetAdvancedOptions);
export const useTradeboxMaxLiquidityPath = () => useSelector(selectTradeboxMaxLiquidityPath);
export const useTradeboxLiquidity = () => useSelector(selectTradeboxLiquidity);
export const useTradeboxIsWrapOrUnwrap = () => useSelector(selectTradeboxIsWrapOrUnwrap);
export const useTradeboxExecutionFee = () => useSelector(selectTradeboxExecutionFee);
export const useTradeboxAdvancedOptions = () => useSelector(selectTradeboxAdvancedOptions);
export const useTradeboxMarkPrice = () => useSelector(selectTradeboxMarkPrice);
export const useTradeboxTriggerPrice = () => useSelector(selectTradeboxTriggerPrice);

export const useTradeboxToToken = () => {
  const toToken = useTradeboxToTokenAddress();
  const tokenData = useTokensData();

  return getByKey(tokenData, toToken);
};

export const useTradeboxFromToken = () => {
  const fromToken = useTradeboxFromTokenAddress();
  const tokenData = useTokensData();

  return getByKey(tokenData, fromToken);
};
