import { BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "config/factors";
import { estimateExecuteDecreaseOrderGasLimit, estimateOrderOraclePriceCount } from "domain/synthetics/fees";
import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import {
  getIsPositionInfoLoaded,
  getMinCollateralFactorForPosition,
  willPositionCollateralBeSufficientForPosition,
} from "domain/synthetics/positions";
import {
  findAllReachableTokens,
  getMarkPrice,
  getNextPositionValuesForDecreaseTrade,
  getTradeFees,
  getTriggerDecreaseOrderType,
} from "domain/synthetics/trade";
import { getOptimalDecreaseAndSwapAmounts } from "domain/synthetics/trade";
import { OrderOption } from "domain/synthetics/trade/usePositionSellerState";
import { parseValue } from "lib/numbers";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";
import { getExecutionFee } from "sdk/utils/fees/executionFee";
import { getIsEquivalentTokens } from "sdk/utils/tokens";
import { createTradeFlags } from "sdk/utils/trade";
import { TradeMode, TradeType } from "sdk/utils/trade/types";

import { SyntheticsState } from "../SyntheticsStateContextProvider";
import { createSelector } from "../utils";
import {
  selectChainId,
  selectClosingPositionKey,
  selectGasLimits,
  selectGasPrice,
  selectMarketsInfoData,
  selectPositionConstants,
  selectPositionsInfoData,
  selectTokensData,
  selectUiFeeFactor,
  selectUserReferralInfo,
} from "./globalSelectors";
import {
  selectIsPnlInLeverage,
  selectIsSetAcceptablePriceImpactEnabled,
  selectSavedAcceptablePriceImpactBuffer,
} from "./settingsSelectors";
import {
  makeSelectDecreasePositionAmounts,
  makeSelectFindSwapPath,
  makeSelectMaxLiquidityPath,
} from "./tradeSelectors";

export const selectPositionSeller = (state: SyntheticsState) => state.positionSeller;
const selectPositionSellerOrderOption = (state: SyntheticsState) => state.positionSeller.orderOption;
const selectPositionSellerTriggerPriceInputValue = (state: SyntheticsState) =>
  state.positionSeller.triggerPriceInputValue;
const selectPositionSellerKeepLeverageRaw = (state: SyntheticsState) => state.positionSeller.keepLeverage;
const selectPositionSellerSelectedTriggerAcceptablePriceImpactBps = (state: SyntheticsState) =>
  state.positionSeller.selectedTriggerAcceptablePriceImpactBps;
const selectPositionSellerCloseUsdInputValue = (state: SyntheticsState) => state.positionSeller.closeUsdInputValue;
const selectPositionSellerReceiveTokenAddress = (state: SyntheticsState) => state.positionSeller.receiveTokenAddress;
const selectPositionSellerReceiveTokenAddressChanged = (state: SyntheticsState) =>
  state.positionSeller.isReceiveTokenChanged;
const selectPositionSellerNumberOfParts = (state: SyntheticsState) => state.positionSeller.numberOfParts;
export const selectPositionSellerPosition = createSelector((q) => {
  const positionKey = q(selectClosingPositionKey);
  return q((s) => (positionKey ? selectPositionsInfoData(s)?.[positionKey] : undefined));
});

export const selectPositionSellerSetDefaultReceiveToken = (state: SyntheticsState) =>
  state.positionSeller.setDefaultReceiveToken;
const selectPositionSellerDefaultReceiveToken = (state: SyntheticsState) => state.positionSeller.defaultReceiveToken;

export const selectPositionSellerNextPositionValuesForDecrease = createSelector((q) => {
  const decreaseAmounts = q(selectPositionSellerDecreaseAmounts);
  const position = q(selectPositionSellerPosition);
  const { minCollateralUsd } = q(selectPositionConstants);
  const isPnlInLeverage = q(selectIsPnlInLeverage);
  const userReferralInfo = q(selectUserReferralInfo);
  const closeSizeUsd = parseValue(q(selectPositionSellerCloseUsdInputValue) || "0", USD_DECIMALS) ?? 0n;

  if (!decreaseAmounts || !position?.marketInfo || minCollateralUsd === undefined || closeSizeUsd <= 0n) {
    return undefined;
  }

  if (decreaseAmounts.acceptablePrice === undefined) return undefined;

  return getNextPositionValuesForDecreaseTrade({
    existingPosition: position,
    marketInfo: position.marketInfo,
    collateralToken: position.collateralToken,
    sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
    sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
    estimatedPnl: decreaseAmounts.estimatedPnl,
    realizedPnl: decreaseAmounts.realizedPnl,
    collateralDeltaUsd: decreaseAmounts.collateralDeltaUsd,
    collateralDeltaAmount: decreaseAmounts.collateralDeltaAmount,
    payedRemainingCollateralUsd: decreaseAmounts.payedRemainingCollateralUsd,
    payedRemainingCollateralAmount: decreaseAmounts.payedRemainingCollateralAmount,
    proportionalPendingImpactDeltaUsd: decreaseAmounts.proportionalPendingImpactDeltaUsd,
    showPnlInLeverage: isPnlInLeverage,
    isLong: position.isLong,
    minCollateralUsd,
    userReferralInfo,
  });
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

  const closeSizeUsd = parseValue(closeSizeInputValue || "0", USD_DECIMALS) ?? 0n;
  const isPnlInLeverage = q(selectIsPnlInLeverage);

  return {
    collateralTokenAddress,
    fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
    marketAddress,
    positionKey,
    tradeMode: orderOption === OrderOption.Twap ? TradeMode.Twap : TradeMode.Market,
    tradeType,
    triggerPrice,
    closeSizeUsd,
    isPnlInLeverage,
    receiveTokenAddress,
  };
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
      swapProfitUsdIn: decreaseAmounts.swapProfitUsdIn,
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
  const isChanged = q(selectPositionSellerReceiveTokenAddressChanged);
  const defaultReceiveTokenAddress = q(selectPositionSellerDefaultReceiveToken);
  const receiveTokenAddress = isChanged
    ? q(selectPositionSellerReceiveTokenAddress)
    : defaultReceiveTokenAddress ?? q(selectPositionSellerReceiveTokenAddress);
  return q((state) => getByKey(selectTokensData(state), receiveTokenAddress));
});

const selectPositionSellerPnlToken = createSelector((q) => {
  const position = q(selectPositionSellerPosition);
  const tokensData = q(selectTokensData);

  if (!position?.marketInfo || !tokensData) return undefined;

  const pnlTokenAddress = position.isLong
    ? position.marketInfo.longTokenAddress
    : position.marketInfo.shortTokenAddress;

  return getByKey(tokensData, pnlTokenAddress);
});

export const selectPositionSellerShouldSwap = createSelector((q) => {
  const position = q(selectPositionSellerPosition);
  const receiveToken = q(selectPositionSellerReceiveToken);
  const decreaseAmounts = q(selectPositionSellerDecreaseAmounts);

  if (!position || !receiveToken || getIsEquivalentTokens(position.collateralToken, receiveToken)) {
    return false;
  }

  if (decreaseAmounts?.decreaseSwapType === DecreasePositionSwapType.SwapCollateralTokenToPnlToken) {
    const pnlToken = q(selectPositionSellerPnlToken);
    if (pnlToken && getIsEquivalentTokens(receiveToken, pnlToken) && decreaseAmounts.primaryOutput.amount > 0n) {
      return false;
    }
  }

  return true;
});

export const selectPositionSellerMaxLiquidityPath = createSelector((q) => {
  const position = q(selectPositionSellerPosition);
  const receiveTokenAddress = q(selectPositionSellerReceiveToken)?.address;

  const shouldSwap = q(selectPositionSellerShouldSwap);
  const decreaseAmounts = q(selectPositionSellerDecreaseAmounts);
  const swapAmounts = q(selectPositionSellerSwapAmounts);
  const receiveToken = q(selectPositionSellerReceiveToken);
  const pnlToken = q(selectPositionSellerPnlToken);
  const isPathBWithSwap =
    shouldSwap &&
    decreaseAmounts?.decreaseSwapType === DecreasePositionSwapType.SwapCollateralTokenToPnlToken &&
    swapAmounts !== undefined &&
    pnlToken !== undefined &&
    receiveToken !== undefined &&
    !getIsEquivalentTokens(receiveToken, pnlToken);

  let fromTokenAddress: string | undefined;
  if (isPathBWithSwap) {
    fromTokenAddress = pnlToken?.address;
  } else {
    fromTokenAddress = position?.collateralTokenAddress;
  }

  const selectMakeLiquidityPath = makeSelectMaxLiquidityPath(fromTokenAddress, receiveTokenAddress);

  return q(selectMakeLiquidityPath);
});

const selectPositionSellerFindSwapPath = createSelector((q) => {
  const position = q(selectPositionSellerPosition);
  const receiveTokenAddress = q(selectPositionSellerReceiveToken)?.address;
  const selectFindSwapPath = makeSelectFindSwapPath(position?.collateralTokenAddress, receiveTokenAddress);

  return q(selectFindSwapPath);
});

const selectPositionSellerFindSwapPathFromPnl = createSelector((q) => {
  const pnlToken = q(selectPositionSellerPnlToken);
  const receiveTokenAddress = q(selectPositionSellerReceiveToken)?.address;
  const selectFindSwapPath = makeSelectFindSwapPath(pnlToken?.address, receiveTokenAddress);

  return q(selectFindSwapPath);
});

const selectPositionSellerOptimalDecrease = createSelector((q) => {
  const position = q(selectPositionSellerPosition);
  const decreaseAmountArgs = q(selectPositionSellerDecreaseAmountArgs);

  if (!decreaseAmountArgs) return undefined;

  const keepLeverageRaw = q(selectPositionSellerKeepLeverageRaw);
  const keepLeverageDisabledByCollateral = q(selectPositionSellerLeverageDisabledByCollateral);
  const keepLeverage = keepLeverageDisabledByCollateral ? false : keepLeverageRaw;

  const tokensData = q(selectTokensData);
  const marketsInfoData = q(selectMarketsInfoData);
  const { minCollateralUsd, minPositionSizeUsd } = q(selectPositionConstants);
  const userReferralInfo = q(selectUserReferralInfo);
  const uiFeeFactor = q(selectUiFeeFactor);
  const acceptablePriceImpactBuffer = q(selectSavedAcceptablePriceImpactBuffer);
  const isSetAcceptablePriceImpactEnabled = q(selectIsSetAcceptablePriceImpactEnabled);
  const chainId = q(selectChainId);

  const {
    collateralTokenAddress,
    marketAddress,
    tradeMode,
    tradeType,
    triggerPrice,
    closeSizeUsd,
    fixedAcceptablePriceImpactBps,
  } = decreaseAmountArgs;

  const collateralToken = collateralTokenAddress ? getByKey(tokensData, collateralTokenAddress) : undefined;
  const marketInfo = marketAddress ? getByKey(marketsInfoData, marketAddress) : undefined;
  const receiveToken = q(selectPositionSellerReceiveToken);
  const tradeFlags = createTradeFlags(tradeType, tradeMode);

  let markPrice = position?.markPrice;
  if (markPrice === undefined && marketInfo) {
    markPrice = getMarkPrice({
      prices: marketInfo.indexToken.prices,
      isIncrease: false,
      isLong: tradeFlags.isLong,
    });
  }

  const triggerOrderType: OrderType | undefined =
    markPrice === undefined || tradeMode !== TradeMode.Trigger
      ? undefined
      : getTriggerDecreaseOrderType({
          isLong: tradeFlags.isLong,
          markPrice: markPrice,
          triggerPrice: triggerPrice ?? 0n,
        });

  if (
    closeSizeUsd === undefined ||
    !marketInfo ||
    !collateralToken ||
    !receiveToken ||
    minCollateralUsd === undefined ||
    minPositionSizeUsd === undefined ||
    (position && !getIsPositionInfoLoaded(position))
  ) {
    return undefined;
  }

  const findSwapPath = q(selectPositionSellerFindSwapPath);
  const findSwapPathFromPnl = q(selectPositionSellerFindSwapPathFromPnl);

  const result = getOptimalDecreaseAndSwapAmounts({
    marketInfo,
    collateralToken,
    isLong: tradeFlags.isLong,
    position: position && getIsPositionInfoLoaded(position) ? position : undefined,
    closeSizeUsd,
    keepLeverage: keepLeverage!,
    triggerPrice,
    fixedAcceptablePriceImpactBps,
    acceptablePriceImpactBuffer,
    userReferralInfo,
    minCollateralUsd,
    minPositionSizeUsd,
    uiFeeFactor,
    triggerOrderType,
    isSetAcceptablePriceImpactEnabled,
    receiveToken,
    findSwapPath,
    findSwapPathFromPnl,
    marketsInfoData,
    chainId,
  });

  return result;
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

export const selectPositionSellerDecreaseAmounts = createSelector((q) => {
  return q(selectPositionSellerOptimalDecrease)?.decreaseAmounts;
});

export const selectPositionSellerSwapAmounts = createSelector((q) => {
  const shouldSwap = q(selectPositionSellerShouldSwap);
  if (!shouldSwap) return undefined;

  return q(selectPositionSellerOptimalDecrease)?.swapAmounts;
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
