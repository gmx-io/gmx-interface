import {
  selectMarketsInfoData,
  selectOrdersInfoData,
  selectPositionsInfoData,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxExistingOrder,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxSelectedPosition,
  selectTradeboxToTokenAddress,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { createEnhancedSelector } from "context/SyntheticsStateContext/utils";
import {
  getAvailableUsdLiquidityForPosition,
  getMinPriceImpactMarket,
  getMostLiquidMarketForPosition,
  isMarketIndexToken,
  MarketInfo,
} from "domain/synthetics/markets";
import { PositionOrderInfo } from "domain/synthetics/orders/types";
import { isIncreaseOrderType } from "domain/synthetics/orders/utils";
import { TokenData } from "domain/synthetics/tokens";
import { getAcceptablePriceByPriceImpact, getMarkPrice } from "domain/synthetics/trade/utils/prices";
import { BigNumber } from "ethers";
import { USD_DECIMALS } from "lib/legacy";
import { expandDecimals } from "lib/numbers";
import { getByKey } from "lib/objects";

export type AvailableMarketsOptions = {
  allMarkets?: MarketInfo[];
  availableMarkets?: MarketInfo[];
  marketWithPosition?: MarketInfo;
  collateralWithPosition?: TokenData;
  marketWithOrder?: MarketInfo;
  collateralWithOrder?: TokenData;
  maxLiquidityMarket?: MarketInfo;
  minPriceImpactMarket?: MarketInfo;
  minPriceImpactBps?: BigNumber;
  isNoSufficientLiquidityInAnyMarket?: boolean;
};

export const selectTradeboxAvailableMarketOptions = createEnhancedSelector((q) => {
  const flags = q(selectTradeboxTradeFlags);
  const indexTokenAddress = q(selectTradeboxToTokenAddress);
  const tokensData = q(selectTokensData);
  const marketsInfoData = q(selectMarketsInfoData);
  const positionsInfo = q(selectPositionsInfoData);
  const ordersInfo = q(selectOrdersInfoData);
  const increaseSizeUsd = q(selectTradeboxIncreasePositionAmounts)?.sizeDeltaUsd;
  const hasExistingPosition = Boolean(q(selectTradeboxSelectedPosition));
  const hasExistingOrder = Boolean(q(selectTradeboxExistingOrder));

  const indexToken = getByKey(tokensData, indexTokenAddress);

  const { isIncrease, isPosition, isLong } = flags;

  if (!isPosition || !indexToken || isLong === undefined) {
    return {};
  }

  const allMarkets = Object.values(marketsInfoData || {}).filter((market) => !market.isSpotOnly && !market.isDisabled);

  const availableMarkets = allMarkets.filter((market) => isMarketIndexToken(market, indexToken.address));

  const liquidMarkets = increaseSizeUsd
    ? availableMarkets.filter((marketInfo) => {
        const liquidity = getAvailableUsdLiquidityForPosition(marketInfo, isLong);

        return liquidity.gt(increaseSizeUsd);
      })
    : availableMarkets;

  const result: AvailableMarketsOptions = { allMarkets, availableMarkets };

  if (isIncrease && liquidMarkets.length === 0) {
    result.isNoSufficientLiquidityInAnyMarket = true;

    return result;
  }

  result.maxLiquidityMarket = getMostLiquidMarketForPosition(liquidMarkets, indexToken.address, undefined, isLong);

  if (!hasExistingPosition) {
    const positions = Object.values(positionsInfo || {});
    const availablePosition = positions.find(
      (pos) =>
        pos.isLong === isLong && availableMarkets.some((market) => market.marketTokenAddress === pos.marketAddress)
    );

    if (availablePosition) {
      result.marketWithPosition = getByKey(marketsInfoData, availablePosition.marketAddress);
      result.collateralWithPosition = availablePosition.collateralToken;
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
    }
  }

  if (
    increaseSizeUsd &&
    !hasExistingPosition &&
    !hasExistingOrder &&
    !result.marketWithPosition &&
    !result.marketWithOrder
  ) {
    const { bestMarket, bestImpactDeltaUsd } = getMinPriceImpactMarket(
      liquidMarkets,
      indexToken.address,
      isLong,
      isIncrease,
      increaseSizeUsd.gt(0) ? increaseSizeUsd : expandDecimals(1000, USD_DECIMALS)
    );

    if (bestMarket && bestImpactDeltaUsd) {
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

  return result;
});
