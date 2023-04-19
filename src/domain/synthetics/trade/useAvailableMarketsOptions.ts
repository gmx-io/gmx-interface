import { BigNumber } from "ethers";
import { USD_DECIMALS } from "lib/legacy";
import { expandDecimals } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useMemo } from "react";
import {
  MarketInfo,
  getAvailableUsdLiquidityForPosition,
  getMinPriceImpactMarket,
  getMostLiquidMarketForPosition,
  isMarketIndexToken,
  useMarketsInfo,
} from "domain/synthetics/markets";
import { OrdersInfoData, PositionOrderInfo, isIncreaseOrderType } from "../orders";
import { PositionsInfoData } from "domain/synthetics/positions";
import { TokenData } from "domain/synthetics/tokens";
import { getAcceptablePrice, getMarkPrice } from "./utils";
import { useVirtualInventory } from "../fees/useVirtualInventory";

export type AvailableMarketsOptions = {
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

export function useAvailableMarketsOptions(
  chainId: number,
  p: {
    isIncrease: boolean;
    disable?: boolean;
    indexToken: TokenData | undefined;
    isLong: boolean;
    increaseSizeUsd: BigNumber | undefined;
    positionsInfo: PositionsInfoData | undefined;
    ordersInfo: OrdersInfoData | undefined;
    hasExistingPosition: boolean;
    hasExistingOrder: boolean;
  }
): AvailableMarketsOptions {
  const {
    disable,
    positionsInfo,
    ordersInfo,
    hasExistingPosition,
    hasExistingOrder,
    isIncrease,
    indexToken,
    increaseSizeUsd,
    isLong,
  } = p;

  const { marketsInfoData } = useMarketsInfo(chainId);
  const { virtualInventoryForPositions } = useVirtualInventory(chainId);

  return useMemo(() => {
    if (disable || !indexToken || isLong === undefined || !virtualInventoryForPositions) {
      return {};
    }

    const availableMarkets = Object.values(marketsInfoData || {}).filter((market) =>
      isMarketIndexToken(market, indexToken.address)
    );

    const liquidMarkets = increaseSizeUsd
      ? availableMarkets.filter((marketInfo) => {
          const liquidity = getAvailableUsdLiquidityForPosition(marketInfo, isLong);

          return liquidity.gt(increaseSizeUsd);
        })
      : availableMarkets;

    const result: AvailableMarketsOptions = { availableMarkets };

    if (isIncrease && liquidMarkets.length === 0) {
      result.isNoSufficientLiquidityInAnyMarket = true;

      return result;
    }

    if (isIncrease) {
      result.maxLiquidityMarket = getMostLiquidMarketForPosition(liquidMarkets, indexToken.address, undefined, isLong);
    }

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
      isIncrease &&
      increaseSizeUsd &&
      !hasExistingPosition &&
      !hasExistingOrder &&
      !result.marketWithPosition &&
      !result.marketWithOrder
    ) {
      const { bestMarket, bestImpactDeltaUsd } = getMinPriceImpactMarket(
        liquidMarkets,
        virtualInventoryForPositions,
        indexToken.address,
        isLong,
        increaseSizeUsd.gt(0) ? increaseSizeUsd : expandDecimals(1000, USD_DECIMALS)
      );

      const { acceptablePriceImpactBps } = getAcceptablePrice({
        isIncrease: true,
        isLong,
        indexPrice: getMarkPrice({ prices: indexToken.prices, isLong, isIncrease: true }),
        priceImpactDeltaUsd: bestImpactDeltaUsd,
        sizeDeltaUsd: increaseSizeUsd,
      });

      result.minPriceImpactMarket = bestMarket;
      result.minPriceImpactBps = acceptablePriceImpactBps;
    }

    return result;
  }, [
    disable,
    indexToken,
    increaseSizeUsd,
    isLong,
    virtualInventoryForPositions,
    marketsInfoData,
    isIncrease,
    hasExistingPosition,
    hasExistingOrder,
    positionsInfo,
    ordersInfo,
  ]);
}
