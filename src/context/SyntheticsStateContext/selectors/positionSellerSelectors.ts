import { BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "config/factors";
import { estimateExecuteDecreaseOrderGasLimit, estimateOrderOraclePriceCount } from "domain/synthetics/fees";
import {
  getIsPositionInfoLoaded,
  getMinCollateralFactorForPosition,
  willPositionCollateralBeSufficientForPosition,
} from "domain/synthetics/positions";
import {
  applySlippageToPrice,
  findAllReachableTokens,
  getMarkPrice,
  getSwapAmountsByFromValue,
  getTradeFees,
} from "domain/synthetics/trade";
import { OrderOption } from "domain/synthetics/trade/usePositionSellerState";
import { parseValue } from "lib/numbers";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { mustNeverExist } from "lib/types";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { TradeMode, TradeType } from "sdk/types/trade";
import { bigMath } from "sdk/utils/bigmath";
import { getExecutionFee } from "sdk/utils/fees/executionFee";
import { getIsEquivalentTokens } from "sdk/utils/tokens";

import { SyntheticsState } from "../SyntheticsStateContextProvider";
import { createSelector } from "../utils";
import {
  selectChainId,
  selectClosingPositionKey,
  selectGasLimits,
  selectGasPrice,
  selectMarketsInfoData,
  selectPositionsInfoData,
  selectTokensData,
  selectUiFeeFactor,
} from "./globalSelectors";
import { selectIsPnlInLeverage } from "./settingsSelectors";
import {
  makeSelectDecreasePositionAmounts,
  makeSelectFindSwapPath,
  makeSelectMaxLiquidityPath,
  makeSelectNextPositionValuesForDecrease,
} from "./tradeSelectors";

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
export const selectPositionSellerNumberOfParts = (state: SyntheticsState) => state.positionSeller.numberOfParts;
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
  const marketAddress = position.market.marketTokenAddress;
  const triggerPrice = q(selectPositionSellerTriggerPrice);
  const closeSizeInputValue = q(selectPositionSellerCloseUsdInputValue);
  const receiveTokenAddress = q(selectPositionSellerReceiveToken)?.address;

  const closeSizeUsd = parseValue(closeSizeInputValue || "0", USD_DECIMALS)!;
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

  if (!getIsPositionInfoLoaded(position)) return false;

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
  } else if (orderOption === OrderOption.Twap) {
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
  const decreaseAmounts = q(selectPositionSellerDecreaseAmounts);
  const gasLimits = q(selectGasLimits);
  const tokensData = q(selectTokensData);
  const gasPrice = q(selectGasPrice);
  const chainId = q(selectChainId);
  const swapAmounts = q(selectPositionSellerSwapAmounts);
  const uiFeeFactor = q(selectUiFeeFactor);
  const orderOption = q(selectPositionSellerOrderOption);
  const numberOfParts = q(selectPositionSellerNumberOfParts);

  if (!position || !decreaseAmounts || !gasLimits || !tokensData || gasPrice === undefined) {
    return {};
  }

  const swapPathLength = swapAmounts?.swapStrategy.swapPathStats?.swapPath?.length || 0;

  const estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {
    swapsCount: swapPathLength,
    decreaseSwapType: decreaseAmounts.decreaseSwapType,
  });

  const sizeReductionBps = bigMath.mulDiv(
    decreaseAmounts.sizeDeltaUsd,
    BASIS_POINTS_DIVISOR_BIGINT,
    position.sizeInUsd
  );
  const collateralDeltaUsd = bigMath.mulDiv(position.collateralUsd, sizeReductionBps, BASIS_POINTS_DIVISOR_BIGINT);

  const oraclePriceCount = estimateOrderOraclePriceCount(swapPathLength);

  return {
    fees: getTradeFees({
      initialCollateralUsd: position.collateralUsd,
      sizeInUsd: position.sizeInUsd,
      collateralDeltaUsd,
      sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
      swapSteps: swapAmounts?.swapStrategy.swapPathStats?.swapSteps || [],
      externalSwapQuote: swapAmounts?.swapStrategy.externalSwapQuote,
      positionFeeUsd: decreaseAmounts.positionFeeUsd,
      swapPriceImpactDeltaUsd: swapAmounts?.swapStrategy.swapPathStats?.totalSwapPriceImpactDeltaUsd || 0n,
      totalPendingImpactDeltaUsd: decreaseAmounts.totalPendingImpactDeltaUsd,
      increasePositionPriceImpactDeltaUsd: 0n,
      priceImpactDiffUsd: decreaseAmounts.priceImpactDiffUsd,
      proportionalPendingImpactDeltaUsd: decreaseAmounts.proportionalPendingImpactDeltaUsd,
      decreasePositionPriceImpactDeltaUsd: decreaseAmounts.closePriceImpactDeltaUsd,
      borrowingFeeUsd: decreaseAmounts.borrowingFeeUsd,
      fundingFeeUsd: decreaseAmounts.fundingFeeUsd,
      feeDiscountUsd: decreaseAmounts.feeDiscountUsd,
      swapProfitFeeUsd: decreaseAmounts.swapProfitFeeUsd,
      uiFeeFactor,
      type: "decrease",
    }),
    executionFee: getExecutionFee(
      chainId,
      gasLimits,
      tokensData,
      estimatedGas,
      gasPrice,
      oraclePriceCount,
      orderOption === OrderOption.Twap ? numberOfParts : undefined
    ),
  };
});

export const selectPositionSellerReceiveToken = createSelector((q) => {
  const orderOption = q(selectPositionSellerOrderOption);
  const position = q(selectPositionSellerPosition);
  const isTrigger = orderOption === OrderOption.Trigger;
  const isChanged = q(selectPositionSellerReceiveTokenAddressChanged);
  const defaultReceiveTokenAddress = q(selectPositionSellerDefaultReceiveToken);
  const receiveTokenAddress = isChanged
    ? q(selectPositionSellerReceiveTokenAddress)
    : defaultReceiveTokenAddress ?? q(selectPositionSellerReceiveTokenAddress);
  return isTrigger ? position?.collateralToken : q((state) => getByKey(selectTokensData(state), receiveTokenAddress));
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

export const selectPositionSellerAvailableReceiveTokens = createSelector((q) => {
  const position = q(selectPositionSellerPosition);
  const chainId = q(selectChainId);
  const tokensData = q(selectTokensData);

  if (!position?.collateralTokenAddress || !tokensData) {
    return EMPTY_ARRAY;
  }

  let wasNativeTokenInserted = false;

  const reachableAddresses = findAllReachableTokens(chainId, position.collateralTokenAddress);

  if (!reachableAddresses?.length) {
    return EMPTY_ARRAY;
  }

  const reachableTokens = reachableAddresses
    .flatMap((address) => {
      const token = getByKey(tokensData, address)!;

      if (token.isWrapped && !wasNativeTokenInserted) {
        wasNativeTokenInserted = true;
        return [getByKey(tokensData, NATIVE_TOKEN_ADDRESS)!, token];
      }

      return [token];
    })
    .sort((a, b) => a.symbol.localeCompare(b.symbol));

  return reachableTokens;
});

export const selectPositionSellerSwapAmounts = createSelector((q) => {
  const position = q(selectPositionSellerPosition);
  const chainId = q(selectChainId);
  const marketsInfoData = q(selectMarketsInfoData);

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
    marketsInfoData,
    chainId,
    externalSwapQuoteParams: undefined,
  });
});

export const selectPositionSellerTriggerPrice = createSelector((q) => {
  const toToken = q(selectPositionSellerPosition)?.indexToken;
  const triggerPriceInputValue = q(selectPositionSellerTriggerPriceInputValue);

  if (!toToken || !triggerPriceInputValue) return undefined;

  let triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);
  if (triggerPrice === 0n) {
    triggerPrice = undefined;
  } else if (triggerPrice !== undefined && toToken?.visualMultiplier) {
    triggerPrice = triggerPrice / BigInt(toToken?.visualMultiplier ?? 1);
  }

  return triggerPrice;
});
