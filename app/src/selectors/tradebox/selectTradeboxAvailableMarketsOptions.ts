import { BN_ZERO } from '@/config/constants';
import { getPriceImpactForPositionCapped } from '@/utils/fee/getPriceImpactForPositionCapped';
import { getByKey } from '@/utils/lib/object';
import { getMarketAvailableLiquidityUsdForPosition } from '@/utils/market/getMarketAvailableLiquidityUsdForPosition';
import { getMarketLargestRelatedExistingPosition } from '@/utils/market/getMarketLargestRelatedExistingPosition';
import { getMarketMarkPrice } from '@/utils/market/getMarketMarkPrice';
import { isIncreaseOrderType } from '@/utils/order/isOrderType';
import { getPositionMostLiquidMarket } from '@/utils/position/getPositionMostLiquidMarket';
import { marketsInfo2IndexTokensStatsMap } from '@/utils/stats/marketsInfo2IndexTokensStatsMap';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';
import { getAcceptablePriceByPriceImpact } from '@/utils/tradebox/getAcceptablePriceByPriceImpact';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import keyBy from 'lodash/keyBy';
import values from 'lodash/values';

import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectOrdersInfo } from '../order/selectOrdersInfo';
import { selectPositionsInfo } from '../position/selectPositionsInfo';
import { selectTokensData } from '../token/selectTokensData';
import { selectTradeboxAvailableMarkets } from './selectTradeboxAvailableMarkets';
import { selectTradeboxExistingOrdersForSelectedPosition } from './selectTradeboxExistingOrdersForSelectedPosition';
import { selectTradeboxIncreasePositionAmounts } from './selectTradeboxIncreasePositionAmounts';
import { selectTradeboxSelectedPosition } from './selectTradeboxSelectedPosition';
import { selectTradeboxToTokenAddress } from './selectTradeboxToTokenAddress';
import { selectTradeboxTradeFlags } from './selectTradeboxTradeFlags';
import { AvailableMarketsOptions } from './types';

export const selectTradeboxAvailableMarketsOptions = createAppStoreSelector(
  [
    selectTradeboxTradeFlags,
    selectTradeboxToTokenAddress,
    selectTokensData,
    selectMarketsInfo,
    selectPositionsInfo,
    selectOrdersInfo,
    selectTradeboxIncreasePositionAmounts,
    selectTradeboxSelectedPosition,
    selectTradeboxExistingOrdersForSelectedPosition,
    selectTradeboxAvailableMarkets,
  ],
  (
    tradeFlags,
    indexTokenAddress,
    tokensData,
    marketsInfo,
    positionsInfo,
    ordersInfo,
    increaseAmounts,
    selectedPosition,
    existingOrder,
    availableMarkets
  ): AvailableMarketsOptions => {
    const { isIncrease, isPosition, isLong } = tradeFlags;
    const increaseSizeUsd = increaseAmounts?.sizeDeltaUsd;
    const hasExistingPosition = Boolean(selectedPosition);
    const hasExistingOrder = Boolean(existingOrder);

    const indexToken = getByKey(tokensData, indexTokenAddress);

    if (!isPosition || !indexToken || isLong === undefined) {
      return {};
    }

    const allMarkets = Object.values(marketsInfo).filter(
      (market) => !market.isSpotOnly && !market.isDisabled
    );

    const liquidMarkets = increaseSizeUsd
      ? availableMarkets.filter((marketInfo) => {
          const liquidity = getMarketAvailableLiquidityUsdForPosition(
            marketInfo,
            isLong
          );
          return liquidity.gt(increaseSizeUsd);
        })
      : availableMarkets;

    const availableIndexTokenStat = values(
      marketsInfo2IndexTokensStatsMap(
        keyBy(liquidMarkets, 'marketTokenAddress')
      ).indexMap
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

    result.maxLiquidityMarket = getPositionMostLiquidMarket(
      liquidMarkets,
      indexToken.address.toBase58(),
      undefined,
      isLong
    );

    // Handle existing position
    if (!hasExistingPosition && positionsInfo) {
      const availablePosition = getMarketLargestRelatedExistingPosition({
        positionsInfo,
        isLong,
        indexTokenAddress: indexToken.address.toBase58(),
      });

      if (availablePosition) {
        result.marketWithPosition = getByKey(
          marketsInfo,
          availablePosition.marketTokenAddress.toBase58()
        );
        result.collateralWithPosition = availablePosition.collateralToken;

        if (increaseSizeUsd) {
          const positionLiquidity = getMarketAvailableLiquidityUsdForPosition(
            result.marketWithPosition!,
            isLong
          );
          result.isNoSufficientLiquidityInMarketWithPosition =
            positionLiquidity.lte(increaseSizeUsd);
        }
      }
    }

    // Handle existing order
    if (!result.marketWithPosition && !hasExistingOrder) {
      const orders = Object.values(ordersInfo);
      const availableOrder = orders.find(
        (order) =>
          isIncreaseOrderType(order.orderType) &&
          order.isLong === isLong &&
          availableMarkets.some((market) =>
            isSameTokenAddress(
              market.marketTokenAddress,
              order.marketTokenAddress
            )
          )
      );

      if (availableOrder) {
        result.marketWithOrder = getByKey(
          marketsInfo,
          availableOrder.marketTokenAddress.toBase58()
        );
        result.collateralWithOrder = availableOrder.targetCollateralToken;
      }
    }

    // Calculate fees and price impact for each market
    if (increaseSizeUsd?.gt(BN_ZERO)) {
      for (const market of liquidMarkets) {
        const priceImpactDeltaUsd = getPriceImpactForPositionCapped(
          market,
          increaseSizeUsd,
          isLong
        );

        const { acceptablePriceDeltaBps } = getAcceptablePriceByPriceImpact({
          isIncrease: true,
          isLong,
          indexPrice: getMarketMarkPrice({
            prices: indexToken.prices,
            isLong,
            isIncrease: true,
          }),
          priceImpactDeltaUsd,
          sizeDeltaUsd: increaseSizeUsd,
        });

        result.availableMarketsOpenFees![market.marketTokenAddress.toBase58()] =
          acceptablePriceDeltaBps;

        if (
          !result.minOpenFeesBps ||
          acceptablePriceDeltaBps < result.minOpenFeesBps
        ) {
          result.minOpenFeesBps = acceptablePriceDeltaBps;
          result.minOpenFeesAvailableMarketAddress =
            market.marketTokenAddress.toBase58();
        }
      }
    }

    return result;
  }
);
