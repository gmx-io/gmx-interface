import { BN_ZERO } from '@/config/constants';
import {
  MarketLiquidityAndFeeStat,
  RelatedMarketsStats,
} from '@/selectors/tradebox/types';
import { getPriceImpactForPositionCapped } from '@/utils/fee/getPriceImpactForPositionCapped';
import { getByKey } from '@/utils/lib/object';
import { getMarketAvailableLiquidityUsdForPosition } from '@/utils/market/getMarketAvailableLiquidityUsdForPosition';
import { getMarketMarkPrice } from '@/utils/market/getMarketMarkPrice';
import { marketsInfo2IndexTokensStatsMap } from '@/utils/stats/marketsInfo2IndexTokensStatsMap';
import { getAcceptablePriceByPriceImpact } from '@/utils/tradebox/getAcceptablePriceByPriceImpact';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { toBN } from 'gmsol';
import keyBy from 'lodash/keyBy';
import values from 'lodash/values';

import { selectTokensData } from '../token/selectTokensData';
import { selectTradeboxAvailableMarkets } from './selectTradeboxAvailableMarkets';
import { selectTradeboxIncreasePositionAmounts } from './selectTradeboxIncreasePositionAmounts';
import { selectTradeboxToTokenAddress } from './selectTradeboxToTokenAddress';
import { selectTradeboxTradeFlags } from './selectTradeboxTradeFlags';

export const selectTradeboxRelatedMarketsStats = createAppStoreSelector(
  [
    selectTradeboxTradeFlags,
    selectTradeboxToTokenAddress,
    selectTokensData,
    selectTradeboxIncreasePositionAmounts,
    selectTradeboxAvailableMarkets,
  ],
  (
    tradeFlags,
    indexTokenAddress,
    tokensData,
    increaseAmounts,
    availableMarkets
  ): RelatedMarketsStats => {
    const { isPosition, isLong } = tradeFlags;
    const increaseSizeUsd = increaseAmounts?.sizeDeltaUsd;
    const indexToken = getByKey(tokensData, indexTokenAddress);

    if (!isPosition || !indexToken || isLong === undefined) {
      return {
        relatedMarketsPositionStats: {},
        relatedMarketStats: [],
      };
    }

    const indexTokensStats = marketsInfo2IndexTokensStatsMap(
      keyBy(availableMarkets, 'marketTokenAddress')
    );
    const relatedMarketStats =
      values(indexTokensStats.indexMap)[0]?.marketTokensStat || [];

    const defaultMarketsEnoughLiquidity: {
      [marketTokenAddress: string]: MarketLiquidityAndFeeStat;
    } = {};

    for (const market of availableMarkets) {
      const liquidity = getMarketAvailableLiquidityUsdForPosition(
        market,
        isLong
      );
      defaultMarketsEnoughLiquidity[market.marketTokenAddress.toBase58()] = {
        isEnoughLiquidity: liquidity.gt(BN_ZERO),
        liquidity,
        openFees: BN_ZERO,
      };
    }

    const result: RelatedMarketsStats = {
      relatedMarketsPositionStats: defaultMarketsEnoughLiquidity,
      relatedMarketStats,
    };

    if (increaseSizeUsd?.gt(BN_ZERO)) {
      for (const market of availableMarkets) {
        const marketAddress = market.marketTokenAddress.toBase58();
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

        const availableUsdLiquidityForPosition =
          defaultMarketsEnoughLiquidity[marketAddress].liquidity;

        result.relatedMarketsPositionStats[marketAddress] = {
          openFees: toBN(acceptablePriceDeltaBps),
          liquidity: availableUsdLiquidityForPosition,
          isEnoughLiquidity:
            availableUsdLiquidityForPosition.gt(increaseSizeUsd),
        };
      }
    }

    return result;
  }
);
