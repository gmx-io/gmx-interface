import { QueryFunction } from "@taskworld.com/rereselect";
import keyBy from "lodash/keyBy";
import values from "lodash/values";

import { BASIS_POINTS_DIVISOR, USD_DECIMALS } from "config/factors";
import { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import {
  selectMarketsInfoData,
  selectOrdersInfoData,
  selectPositionsInfoData,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxCollateralTokenAddress,
  selectTradeboxExistingOrder,
  selectTradeboxFocusedInput,
  selectTradeboxFromTokenAddress,
  selectTradeboxFromTokenInputValue,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxLeverageOption,
  selectTradeboxSelectedPosition,
  selectTradeboxSelectedPositionKey,
  selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
  selectTradeboxToTokenAddress,
  selectTradeboxToTokenAmount,
  selectTradeboxTradeFlags,
  selectTradeboxTradeMode,
  selectTradeboxTradeType,
  selectTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { getCappedPositionImpactUsd, getFeeItem } from "domain/synthetics/fees";
import {
  MarketInfo,
  getAvailableUsdLiquidityForPosition,
  getMinPriceImpactMarket,
  getMostLiquidMarketForPosition,
} from "domain/synthetics/markets";
import { getLargestRelatedExistingPositionOrOrder } from "domain/synthetics/markets/chooseSuitableMarket";
import { PositionOrderInfo, isIncreaseOrderType } from "domain/synthetics/orders";
import {
  IndexTokenStat,
  marketsInfoData2IndexTokenStatsMap,
} from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { TokenData } from "domain/synthetics/tokens";
import { getAcceptablePriceByPriceImpact, getMarkPrice } from "domain/synthetics/trade/utils/prices";
import { expandDecimals, parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";
import { selectIsLeverageSliderEnabled } from "../settingsSelectors";
import { createTradeFlags, makeSelectIncreasePositionAmounts } from "../tradeSelectors";
import { selectTradeboxAvailableMarkets } from "./selectTradeboxAvailableMarkets";

export type AvailableMarketsOptions = {
  allMarkets?: MarketInfo[];
  availableMarkets?: MarketInfo[];
  availableIndexTokenStat?: IndexTokenStat;
  availableMarketsOpenFees?: { [marketTokenAddress: string]: bigint };
  marketWithPosition?: MarketInfo;
  /**
   * Collateral token of the position in `marketWithPosition`
   */
  collateralWithPosition?: TokenData;
  marketWithOrder?: MarketInfo;
  /**
   * Collateral token of the order in `marketWithOrder`
   */
  collateralWithOrder?: TokenData;
  collateralWithOrderShouldUnwrapNativeToken?: boolean;
  maxLiquidityMarket?: MarketInfo;
  minPriceImpactMarket?: MarketInfo;
  minPriceImpactBps?: bigint;
  minPriceImpactPositionFeeBps?: bigint;
  minOpenFeesMarket?: {
    marketAddress: string;
    openFeesBps: bigint;
    priceImpactDeltaBps: bigint;
  };
  isNoSufficientLiquidityInAnyMarket?: boolean;
  isNoSufficientLiquidityInMarketWithPosition?: boolean;
};

export const selectTradeboxAvailableMarketsOptions = createSelector((q) => {
  const flags = q(selectTradeboxTradeFlags);
  const indexTokenAddress = q(selectTradeboxToTokenAddress);
  const tokensData = q(selectTokensData);
  const marketsInfoData = q(selectMarketsInfoData);
  const positionsInfo = q(selectPositionsInfoData);
  const ordersInfo = q(selectOrdersInfoData);
  const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);
  const increaseSizeUsd = increaseAmounts?.sizeDeltaUsd;
  const hasExistingPosition = Boolean(q(selectTradeboxSelectedPosition));
  const hasExistingOrder = Boolean(q(selectTradeboxExistingOrder));

  const indexToken = getByKey(tokensData, indexTokenAddress);

  const { isIncrease, isPosition, isLong } = flags;

  if (!isPosition || !indexToken || isLong === undefined) {
    return {};
  }

  const allMarkets = Object.values(marketsInfoData || {}).filter((market) => !market.isSpotOnly && !market.isDisabled);

  const availableMarkets = q(selectTradeboxAvailableMarkets);

  const liquidMarkets = increaseSizeUsd
    ? availableMarkets.filter((marketInfo) => {
        const liquidity = getAvailableUsdLiquidityForPosition(marketInfo, isLong);

        return liquidity > increaseSizeUsd;
      })
    : availableMarkets;

  const availableIndexTokenStat = values(
    marketsInfoData2IndexTokenStatsMap(keyBy(liquidMarkets, "marketTokenAddress")).indexMap
  )[0];

  const result: AvailableMarketsOptions = {
    allMarkets,
    availableMarkets,
    availableIndexTokenStat,
    availableMarketsOpenFees: {},
  };

  if (isIncrease && liquidMarkets.length === 0) {
    result.isNoSufficientLiquidityInAnyMarket = true;

    return result;
  }

  result.maxLiquidityMarket = getMostLiquidMarketForPosition(liquidMarkets, indexToken.address, undefined, isLong);

  if (!hasExistingPosition) {
    if (positionsInfo) {
      const availablePositionOrOrder = getLargestRelatedExistingPositionOrOrder({
        isLong,
        ordersInfo,
        indexTokenAddress: indexToken.address,
        positionsInfo: positionsInfo,
      });

      if (availablePositionOrOrder) {
        if (availablePositionOrOrder.type === "position") {
          result.marketWithPosition = getByKey(marketsInfoData, availablePositionOrOrder.marketAddress);
          result.collateralWithPosition = tokensData?.[availablePositionOrOrder.collateralTokenAddress];
          if (increaseSizeUsd != undefined) {
            result.isNoSufficientLiquidityInMarketWithPosition =
              getAvailableUsdLiquidityForPosition(result.marketWithPosition!, isLong) <= increaseSizeUsd;
          }
        } else {
          result.marketWithOrder = getByKey(marketsInfoData, availablePositionOrOrder.marketAddress);
          result.collateralWithOrder = tokensData?.[availablePositionOrOrder.collateralTokenAddress];
        }
      }
    }
  }

  if (!result.marketWithPosition && !hasExistingOrder) {
    const orders = Object.values(ordersInfo || {});
    const availableOrder = orders.find(
      (order) =>
        isIncreaseOrderType(order.orderType) &&
        order.isLong === isLong &&
        availableMarkets.some((market) => market.marketTokenAddress === order.marketAddress)
    ) as PositionOrderInfo;

    if (availableOrder) {
      result.marketWithOrder = getByKey(marketsInfoData, availableOrder.marketAddress);
      result.collateralWithOrder = availableOrder.targetCollateralToken;
      result.collateralWithOrderShouldUnwrapNativeToken = availableOrder.shouldUnwrapNativeToken;
    }
  }

  if (increaseSizeUsd != undefined) {
    const { bestMarket, bestImpactDeltaUsd } = getMinPriceImpactMarket(
      liquidMarkets,
      indexToken.address,
      isLong,
      isIncrease,
      increaseSizeUsd > 0n ? increaseSizeUsd : expandDecimals(1000, USD_DECIMALS)
    );

    if (bestMarket && bestImpactDeltaUsd != undefined) {
      const { acceptablePriceDeltaBps } = getAcceptablePriceByPriceImpact({
        isIncrease: true,
        isLong,
        indexPrice: getMarkPrice({ prices: indexToken.prices, isLong, isIncrease: true }),
        priceImpactDeltaUsd: bestImpactDeltaUsd,
        sizeDeltaUsd: increaseSizeUsd,
      });

      result.minPriceImpactMarket = bestMarket;
      result.minPriceImpactBps = acceptablePriceDeltaBps;
    }
  }

  if (increaseSizeUsd !== undefined && increaseSizeUsd > 0n) {
    for (const liquidMarket of liquidMarkets) {
      const marketIncreasePositionAmounts = getMarketIncreasePositionAmounts(q, liquidMarket.marketTokenAddress);
      if (!marketIncreasePositionAmounts) {
        continue;
      }

      const positionFeeBeforeDiscount = getFeeItem(
        -(marketIncreasePositionAmounts.positionFeeUsd + marketIncreasePositionAmounts.feeDiscountUsd),
        marketIncreasePositionAmounts.sizeDeltaUsd
      );

      const priceImpactDeltaUsd = getCappedPositionImpactUsd(
        liquidMarket,
        marketIncreasePositionAmounts.sizeDeltaUsd,
        isLong
      );

      const { acceptablePriceDeltaBps } = getAcceptablePriceByPriceImpact({
        isIncrease: true,
        isLong,
        indexPrice: getMarkPrice({ prices: indexToken.prices, isLong, isIncrease: true }),
        priceImpactDeltaUsd: priceImpactDeltaUsd,
        sizeDeltaUsd: marketIncreasePositionAmounts.sizeDeltaUsd,
      });

      const openFees = positionFeeBeforeDiscount!.bps + acceptablePriceDeltaBps;

      result.availableMarketsOpenFees![liquidMarket.marketTokenAddress] = openFees;

      // opemFess has negative values, so the higher the value, the user pays less
      if (result.minOpenFeesMarket === undefined || openFees > result.minOpenFeesMarket.openFeesBps) {
        result.minOpenFeesMarket = {
          marketAddress: liquidMarket.marketTokenAddress,
          openFeesBps: openFees,
          priceImpactDeltaBps: acceptablePriceDeltaBps,
        };
      }
    }
  }

  return result;
});

export function getMarketIncreasePositionAmounts(q: QueryFunction<SyntheticsState>, marketAddress: string) {
  const tokensData = q(selectTokensData);
  const tradeMode = q(selectTradeboxTradeMode);
  const tradeType = q(selectTradeboxTradeType);
  const fromTokenAddress = q(selectTradeboxFromTokenAddress);
  const fromTokenInputValue = q(selectTradeboxFromTokenInputValue);
  const toTokenAddress = q(selectTradeboxToTokenAddress);
  const leverageOption = q(selectTradeboxLeverageOption);
  const isLeverageSliderEnabled = q(selectIsLeverageSliderEnabled);
  const focusedInput = q(selectTradeboxFocusedInput);
  const collateralTokenAddress = q(selectTradeboxCollateralTokenAddress);
  const selectedTriggerAcceptablePriceImpactBps = q(selectTradeboxSelectedTriggerAcceptablePriceImpactBps);
  const triggerPrice = q(selectTradeboxTriggerPrice);

  const tradeFlags = createTradeFlags(tradeType, tradeMode);
  const fromToken = fromTokenAddress ? getByKey(tokensData, fromTokenAddress) : undefined;
  const fromTokenAmount = fromToken ? parseValue(fromTokenInputValue || "0", fromToken.decimals)! : 0n;
  const toTokenAmount = q(selectTradeboxToTokenAmount);
  const leverage = BigInt(parseInt(String(Number(leverageOption!) * BASIS_POINTS_DIVISOR)));
  const positionKey = q(selectTradeboxSelectedPositionKey);

  const selector = makeSelectIncreasePositionAmounts({
    collateralTokenAddress,
    fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
    indexTokenAddress: toTokenAddress,
    indexTokenAmount: toTokenAmount,
    initialCollateralAmount: fromTokenAmount,
    initialCollateralTokenAddress: fromTokenAddress,
    leverage,
    marketAddress,
    positionKey,
    strategy: isLeverageSliderEnabled
      ? focusedInput === "from"
        ? "leverageByCollateral"
        : "leverageBySize"
      : "independent",
    tradeMode,
    tradeType,
    triggerPrice,
    tokenTypeForSwapRoute: tradeFlags.isPosition ? "collateralToken" : "indexToken",
  });

  return q(selector);
}
