import { QueryFunction } from "@taskworld.com/rereselect";
import { BASIS_POINTS_DIVISOR } from "config/factors";
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
  selectTradeboxIsLeverageEnabled,
  selectTradeboxLeverageOption,
  selectTradeboxSelectedPosition,
  selectTradeboxSelectedPositionKey,
  selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
  selectTradeboxToTokenAddress,
  selectTradeboxToTokenInputValue,
  selectTradeboxTradeFlags,
  selectTradeboxTradeMode,
  selectTradeboxTradeType,
  selectTradeboxTriggerPriceInputValue,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { getCappedPositionImpactUsd, getFeeItem } from "domain/synthetics/fees/utils";
import {
  MarketInfo,
  getAvailableUsdLiquidityForPosition,
  getMinPriceImpactMarket,
  getMostLiquidMarketForPosition,
} from "domain/synthetics/markets";
import { getLargestRelatedExistingPosition } from "domain/synthetics/markets/chooseSuitableMarket";
import { PositionOrderInfo } from "domain/synthetics/orders/types";
import { isIncreaseOrderType } from "domain/synthetics/orders/utils";
import { TokenData } from "domain/synthetics/tokens";
import { getAcceptablePriceByPriceImpact, getMarkPrice } from "domain/synthetics/trade/utils/prices";
import { USD_DECIMALS } from "lib/legacy";
import { expandDecimals, parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";
import { createTradeFlags, makeSelectIncreasePositionAmounts } from "../tradeSelectors";
import {
  IndexTokenStat,
  marketsInfoData2IndexTokenStatsMap,
} from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { keyBy, values } from "lodash";
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
  minOpenFeesAvailableMarketAddress?: string;
  minOpenFeesBps?: bigint;
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
      const availablePosition = getLargestRelatedExistingPosition({
        isLong,
        indexTokenAddress: indexToken.address,
        positionsInfo: positionsInfo,
      });

      if (availablePosition) {
        result.marketWithPosition = getByKey(marketsInfoData, availablePosition.marketAddress);
        result.collateralWithPosition = availablePosition.collateralToken;
        if (increaseSizeUsd != undefined) {
          result.isNoSufficientLiquidityInMarketWithPosition =
            getAvailableUsdLiquidityForPosition(result.marketWithPosition!, isLong) <= increaseSizeUsd;
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
      increaseSizeUsd > 0 ? increaseSizeUsd : expandDecimals(1000, USD_DECIMALS)
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

  if (increaseSizeUsd !== undefined && increaseSizeUsd > 0) {
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

      if (result.minOpenFeesBps === undefined || openFees > result.minOpenFeesBps) {
        result.minOpenFeesBps = openFees;
        result.minOpenFeesAvailableMarketAddress = liquidMarket.marketTokenAddress;
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
  const toTokenInputValue = q(selectTradeboxToTokenInputValue);
  const leverageOption = q(selectTradeboxLeverageOption);
  const isLeverageEnabled = q(selectTradeboxIsLeverageEnabled);
  const focusedInput = q(selectTradeboxFocusedInput);
  const collateralTokenAddress = q(selectTradeboxCollateralTokenAddress);
  const selectedTriggerAcceptablePriceImpactBps = q(selectTradeboxSelectedTriggerAcceptablePriceImpactBps);
  const triggerPriceInputValue = q(selectTradeboxTriggerPriceInputValue);

  const tradeFlags = createTradeFlags(tradeType, tradeMode);
  const fromToken = fromTokenAddress ? getByKey(tokensData, fromTokenAddress) : undefined;
  const fromTokenAmount = fromToken ? parseValue(fromTokenInputValue || "0", fromToken.decimals)! : 0n;
  const toToken = toTokenAddress ? getByKey(tokensData, toTokenAddress) : undefined;
  const toTokenAmount = toToken ? parseValue(toTokenInputValue || "0", toToken.decimals)! : 0n;
  const leverage = BigInt(parseInt(String(Number(leverageOption!) * BASIS_POINTS_DIVISOR)));
  const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);
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
    strategy: isLeverageEnabled ? (focusedInput === "from" ? "leverageByCollateral" : "leverageBySize") : "independent",
    tradeMode,
    tradeType,
    triggerPrice,
    tokenTypeForSwapRoute: tradeFlags.isPosition ? "collateralToken" : "indexToken",
  });

  return q(selector);
}
