import { TradeMode, TradeType } from "domain/synthetics/trade/types";
import { OrderOption } from "domain/synthetics/trade/usePositionSellerState";
import { USD_DECIMALS } from "lib/legacy";
import { parseValue } from "lib/numbers";
import { SyntheticsState } from "../SyntheticsStateContextProvider";
import { createSelector } from "../utils";
import {
  selectClosingPositionKey,
  selectPositionsInfoData,
  selectTokensData,
  selectUiFeeFactor,
  selectGasLimits,
  selectGasPrice,
  selectChainId,
} from "./globalSelectors";
import {
  makeSelectDecreasePositionAmounts,
  makeSelectFindSwapPath,
  makeSelectMaxLiquidityPath,
  makeSelectNextPositionValuesForDecrease,
} from "./tradeSelectors";
import {
  getMinCollateralFactorForPosition,
  willPositionCollateralBeSufficientForPosition,
} from "domain/synthetics/positions";
import { selectIsPnlInLeverage } from "./settingsSelectors";
import {
  applySlippageToPrice,
  getSwapAmountsByFromValue,
  getNextPositionExecutionPrice,
} from "domain/synthetics/trade";
import { mustNeverExist } from "lib/types";
import { getByKey } from "lib/objects";
import { getIsEquivalentTokens } from "domain/tokens";
import { getMarkPrice, getTradeFees } from "domain/synthetics/trade";
import { estimateExecuteDecreaseOrderGasLimit, getExecutionFee } from "domain/synthetics/fees";
import { estimateOrderOraclePriceCount } from "domain/synthetics/fees/utils/estimateOraclePriceCount";

export const selectPositionSeller = (state: SyntheticsState) => state.positionSeller;
export const selectPositionSellerOrderOption = (state: SyntheticsState) => state.positionSeller.orderOption;
export const selectPositionSellerTriggerPriceInputValue = (state: SyntheticsState) =>
  state.positionSeller.triggerPriceInputValue;
export const selectPositionSellerKeepLeverageRaw = (state: SyntheticsState) => state.positionSeller.keepLeverage;
export const selectPositionSellerSelectedTriggerAcceptablePriceImpactBps = (state: SyntheticsState) =>
  state.positionSeller.selectedTriggerAcceptablePriceImpactBps;
export const selectPositionSellerCloseUsdInputValue = (state: SyntheticsState) =>
  state.positionSeller.closeUsdInputValue;
const selectPositionSellerReceiveTokenAddress = (state: SyntheticsState) => state.positionSeller.receiveTokenAddress;
export const selectPositionSellerAllowedSlippage = (state: SyntheticsState) => state.positionSeller.allowedSlippage;
export const selectPositionSellerReceiveTokenAddressChanged = (state: SyntheticsState) =>
  state.positionSeller.isReceiveTokenChanged;
export const selectPositionSellerPosition = createSelector((q) => {
  const positionKey = q(selectClosingPositionKey);
  return q((s) => (positionKey ? selectPositionsInfoData(s)?.[positionKey] : undefined));
});

export const selectPositionSellerSetDefaultReceiveToken = (state: SyntheticsState) =>
  state.positionSeller.setDefaultReceiveToken;
export const selectPositionSellerDefaultReceiveToken = (state: SyntheticsState) =>
  state.positionSeller.defaultReceiveToken;

export const selectPositionSellerNextPositionValuesForDecrease = createSelector((q) => {
  const decreaseAmountArgs = q(selectPositionSellerDecreaseAmountArgs);
  const keepLeverageRaw = q(selectPositionSellerKeepLeverageRaw);
  const keepLeverageDisabledByCollateral = q(selectPositionSellerLeverageDisabledByCollateral);
  const keepLeverage = keepLeverageDisabledByCollateral ? false : keepLeverageRaw;

  if (!decreaseAmountArgs) return undefined;

  const selector = makeSelectNextPositionValuesForDecrease({ ...decreaseAmountArgs, keepLeverage });
  return q(selector);
});

const selectPositionSellerDecreaseAmountArgs = createSelector((q) => {
  const position = q(selectPositionSellerPosition);

  if (!position) return undefined;

  const selectedTriggerAcceptablePriceImpactBps = q(selectPositionSellerSelectedTriggerAcceptablePriceImpactBps);
  const positionKey = q(selectClosingPositionKey);
  const orderOption = q(selectPositionSellerOrderOption);
  const tradeType = position.isLong ? TradeType.Long : TradeType.Short;
  const collateralTokenAddress = position.collateralTokenAddress;
  const marketAddress = position.marketInfo.marketTokenAddress;
  const triggerPriceInputValue = q(selectPositionSellerTriggerPriceInputValue);
  const closeSizeInputValue = q(selectPositionSellerCloseUsdInputValue);
  const receiveTokenAddress = q(selectPositionSellerReceiveToken)?.address;

  const closeSizeUsd = parseValue(closeSizeInputValue || "0", USD_DECIMALS)!;
  const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);
  const isPnlInLeverage = q(selectIsPnlInLeverage);

  return {
    collateralTokenAddress,
    fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
    marketAddress,
    positionKey,
    tradeMode: orderOption === OrderOption.Market ? TradeMode.Market : TradeMode.Trigger,
    tradeType,
    triggerPrice,
    closeSizeUsd,
    isPnlInLeverage,
    receiveTokenAddress,
  };
});

export const selectPositionSellerDecreaseAmounts = createSelector((q) => {
  const decreaseAmountArgs = q(selectPositionSellerDecreaseAmountArgs);
  const keepLeverageRaw = q(selectPositionSellerKeepLeverageRaw);
  const keepLeverageDisabledByCollateral = q(selectPositionSellerLeverageDisabledByCollateral);
  const keepLeverage = keepLeverageDisabledByCollateral ? false : keepLeverageRaw;

  if (!decreaseAmountArgs) return undefined;

  const selector = makeSelectDecreasePositionAmounts({ ...decreaseAmountArgs, keepLeverage });

  return q(selector);
});

const selectPositionSellerDecreaseAmountsWithKeepLeverage = createSelector((q) => {
  const decreaseAmountArgs = q(selectPositionSellerDecreaseAmountArgs);

  if (!decreaseAmountArgs) return undefined;

  const selector = makeSelectDecreasePositionAmounts({ ...decreaseAmountArgs, keepLeverage: true });

  return q(selector);
});

export const selectPositionSellerKeepLeverage = createSelector((q) => {
  const position = q(selectPositionSellerPosition);

  if (!position) return false;

  const keepLeverage = q(selectPositionSellerKeepLeverageRaw);

  if (!keepLeverage) return false;

  const disabledByCollateral = q(selectPositionSellerLeverageDisabledByCollateral);

  return !disabledByCollateral;
});

export const selectPositionSellerLeverageDisabledByCollateral = createSelector((q) => {
  const position = q(selectPositionSellerPosition);

  if (!position) return false;

  const decreaseAmountsWithKeepLeverage = q(selectPositionSellerDecreaseAmountsWithKeepLeverage);

  if (!decreaseAmountsWithKeepLeverage) return false;

  if (decreaseAmountsWithKeepLeverage.sizeDeltaUsd >= position.sizeInUsd) return false;

  const minCollateralFactor = getMinCollateralFactorForPosition(
    position,
    -decreaseAmountsWithKeepLeverage.sizeDeltaUsd
  );

  if (minCollateralFactor === undefined) return false;

  return !willPositionCollateralBeSufficientForPosition(
    position,
    decreaseAmountsWithKeepLeverage.collateralDeltaAmount,
    decreaseAmountsWithKeepLeverage.realizedPnl,
    minCollateralFactor,
    -decreaseAmountsWithKeepLeverage.sizeDeltaUsd
  );
});

export const selectPositionSellerAcceptablePrice = createSelector((q) => {
  const position = q(selectPositionSellerPosition);
  const decreaseAmounts = q(selectPositionSellerDecreaseAmounts);

  if (!position || decreaseAmounts?.acceptablePrice === undefined) {
    return undefined;
  }

  const orderOption = q(selectPositionSellerOrderOption);
  const allowedSlippage = q(selectPositionSellerAllowedSlippage);

  if (orderOption === OrderOption.Market) {
    return applySlippageToPrice(allowedSlippage, decreaseAmounts.acceptablePrice, false, position.isLong);
  } else if (orderOption === OrderOption.Trigger) {
    return decreaseAmounts.acceptablePrice;
  } else {
    mustNeverExist(orderOption);
  }
});

export const selectPositionSellerMarkPrice = createSelector((q) => {
  const position = q(selectPositionSellerPosition);

  return position
    ? getMarkPrice({ prices: position.indexToken.prices, isLong: position.isLong, isIncrease: false })
    : undefined;
});

export const selectPositionSellerFees = createSelector((q) => {
  const position = q(selectPositionSellerPosition);
  const nextPositionValues = q(selectPositionSellerNextPositionValuesForDecrease);
  const decreaseAmounts = q(selectPositionSellerDecreaseAmounts);
  const gasLimits = q(selectGasLimits);
  const tokensData = q(selectTokensData);
  const gasPrice = q(selectGasPrice);
  const chainId = q(selectChainId);
  const swapAmounts = q(selectPositionSellerSwapAmounts);
  const uiFeeFactor = q(selectUiFeeFactor);

  if (!position || !decreaseAmounts || !gasLimits || !tokensData || gasPrice === undefined) {
    return {};
  }

  const swapPathLength = swapAmounts?.swapPathStats?.swapPath?.length || 0;

  const estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {
    swapsCount: swapPathLength,
    decreaseSwapType: decreaseAmounts.decreaseSwapType,
  });

  const collateralDeltaUsd =
    nextPositionValues?.nextCollateralUsd !== undefined && position?.collateralUsd !== undefined
      ? nextPositionValues.nextCollateralUsd - position?.collateralUsd
      : 0n;

  const oraclePriceCount = estimateOrderOraclePriceCount(swapPathLength);
  return {
    fees: getTradeFees({
      initialCollateralUsd: position.collateralUsd,
      collateralDeltaUsd,
      sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
      swapSteps: swapAmounts?.swapPathStats?.swapSteps || [],
      positionFeeUsd: decreaseAmounts.positionFeeUsd,
      swapPriceImpactDeltaUsd: swapAmounts?.swapPathStats?.totalSwapPriceImpactDeltaUsd || 0n,
      positionPriceImpactDeltaUsd: decreaseAmounts.positionPriceImpactDeltaUsd,
      priceImpactDiffUsd: decreaseAmounts.priceImpactDiffUsd,
      borrowingFeeUsd: decreaseAmounts.borrowingFeeUsd,
      fundingFeeUsd: decreaseAmounts.fundingFeeUsd,
      feeDiscountUsd: decreaseAmounts.feeDiscountUsd,
      swapProfitFeeUsd: decreaseAmounts.swapProfitFeeUsd,
      uiFeeFactor,
    }),
    executionFee: getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice, oraclePriceCount),
  };
});

export const selectPositionSellerExecutionPrice = createSelector(function selectPositionSellerExecutionPrice(q) {
  const position = q(selectPositionSellerPosition);
  const markPrice = q(selectPositionSellerMarkPrice);
  const orderOption = q(selectPositionSellerOrderOption);
  const { fees } = q(selectPositionSellerFees);

  const decreaseAmounts = q(selectPositionSellerDecreaseAmounts);

  if (!position || fees?.positionPriceImpact?.deltaUsd === undefined) return null;

  const nextTriggerPrice = orderOption === OrderOption.Market ? markPrice : decreaseAmounts?.triggerPrice;
  const sizeDeltaUsd = decreaseAmounts?.sizeDeltaUsd;

  if (nextTriggerPrice === undefined || sizeDeltaUsd === undefined) return null;

  return getNextPositionExecutionPrice({
    triggerPrice: nextTriggerPrice,
    priceImpactUsd: fees.positionPriceImpact.deltaUsd,
    sizeDeltaUsd,
    isLong: position.isLong,
    isIncrease: false,
  });
});

export const selectPositionSellerReceiveToken = createSelector((q) => {
  const orderOption = q(selectPositionSellerOrderOption);
  const position = q(selectPositionSellerPosition);
  const isTrigger = orderOption === OrderOption.Trigger;
  const tokensData = q(selectTokensData);
  const isChanged = q(selectPositionSellerReceiveTokenAddressChanged);
  const defaultReceiveTokenAddress = q(selectPositionSellerDefaultReceiveToken);
  const receiveTokenAddress = isChanged
    ? q(selectPositionSellerReceiveTokenAddress)
    : defaultReceiveTokenAddress ?? q(selectPositionSellerReceiveTokenAddress);
  return isTrigger ? position?.collateralToken : getByKey(tokensData, receiveTokenAddress);
});

export const selectPositionSellerShouldSwap = createSelector((q) => {
  const position = q(selectPositionSellerPosition);
  const receiveToken = q(selectPositionSellerReceiveToken);

  return position && receiveToken && !getIsEquivalentTokens(position.collateralToken, receiveToken);
});

export const selectPositionSellerMaxLiquidityPath = createSelector((q) => {
  const position = q(selectPositionSellerPosition);
  const receiveTokenAddress = q(selectPositionSellerReceiveToken)?.address;
  const selectMakeLiquidityPath = makeSelectMaxLiquidityPath(position?.collateralTokenAddress, receiveTokenAddress);

  return q(selectMakeLiquidityPath);
});

export const selectPositionSellerFindSwapPath = createSelector((q) => {
  const position = q(selectPositionSellerPosition);
  const receiveTokenAddress = q(selectPositionSellerReceiveToken)?.address;
  const selectFindSwapPath = makeSelectFindSwapPath(position?.collateralTokenAddress, receiveTokenAddress);

  return q(selectFindSwapPath);
});

export const selectPositionSellerSwapAmounts = createSelector((q) => {
  const position = q(selectPositionSellerPosition);

  if (!position) {
    return undefined;
  }

  const shouldSwap = q(selectPositionSellerShouldSwap);
  const receiveToken = q(selectPositionSellerReceiveToken);
  const decreaseAmounts = q(selectPositionSellerDecreaseAmounts);
  const uiFeeFactor = q(selectUiFeeFactor);

  if (!shouldSwap || !receiveToken || decreaseAmounts?.receiveTokenAmount === undefined) {
    return undefined;
  }

  const findSwapPath = q(selectPositionSellerFindSwapPath);

  return getSwapAmountsByFromValue({
    tokenIn: position.collateralToken,
    tokenOut: receiveToken,
    amountIn: decreaseAmounts.receiveTokenAmount,
    isLimit: false,
    findSwapPath,
    uiFeeFactor,
  });
});
