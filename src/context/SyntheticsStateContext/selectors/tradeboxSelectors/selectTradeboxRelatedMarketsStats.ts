import { fromPairs, keyBy, values } from "lodash";

import { selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  getMarketIncreasePositionAmounts,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxToTokenAddress,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { getCappedPositionImpactUsd, getFeeItem } from "domain/synthetics/fees/utils";
import { getAvailableUsdLiquidityForPosition } from "domain/synthetics/markets";
import {
  MarketStat,
  marketsInfoData2IndexTokenStatsMap,
} from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { getAcceptablePriceByPriceImpact, getMarkPrice } from "domain/synthetics/trade/utils/prices";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { selectTradeboxAvailableMarkets } from "./selectTradeboxAvailableMarkets";

export type MarketLiquidityAndFeeStat = {
  isEnoughLiquidity: boolean;
  liquidity: bigint;
  openFees: bigint | undefined;
};

export type RelatedMarketsStats = {
  relatedMarketsPositionStats: {
    [marketTokenAddress: string]: MarketLiquidityAndFeeStat;
  };
  relatedMarketStats: MarketStat[];
};

export const selectTradeboxRelatedMarketsStats = createSelector((q) => {
  const flags = q(selectTradeboxTradeFlags);
  const indexTokenAddress = q(selectTradeboxToTokenAddress);
  const tokensData = q(selectTokensData);
  const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);
  const increaseSizeUsd = increaseAmounts?.sizeDeltaUsd;

  const indexToken = getByKey(tokensData, indexTokenAddress);

  const { isPosition, isLong } = flags;

  if (!isPosition || !indexToken || isLong === undefined) {
    return {
      relatedMarketsPositionStats: {},
      relatedMarketStats: [],
    } as RelatedMarketsStats;
  }

  const availableMarkets = q(selectTradeboxAvailableMarkets);

  const relatedMarketStats =
    values(marketsInfoData2IndexTokenStatsMap(keyBy(availableMarkets, "marketTokenAddress")).indexMap)[0]
      ?.marketsStats || EMPTY_ARRAY;

  const defaultMarketsEnoughLiquidity = fromPairs(
    availableMarkets.map((market) => {
      const liquidity = getAvailableUsdLiquidityForPosition(market, isLong);
      return [market.marketTokenAddress, { isEnoughLiquidity: liquidity > 0, liquidity, openFees: undefined }];
    })
  );

  const result: RelatedMarketsStats = {
    relatedMarketsPositionStats: defaultMarketsEnoughLiquidity,
    relatedMarketStats: relatedMarketStats,
  };

  if (increaseSizeUsd !== undefined && increaseSizeUsd > 0) {
    for (const relatedMarket of availableMarkets) {
      const marketIncreasePositionAmounts = getMarketIncreasePositionAmounts(q, relatedMarket.marketTokenAddress);
      if (!marketIncreasePositionAmounts) {
        continue;
      }

      const positionFeeBeforeDiscount = getFeeItem(
        (marketIncreasePositionAmounts.positionFeeUsd + marketIncreasePositionAmounts.feeDiscountUsd) * -1n,
        marketIncreasePositionAmounts.sizeDeltaUsd
      );

      const priceImpactDeltaUsd = getCappedPositionImpactUsd(
        relatedMarket,
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

      const availableUsdLiquidityForPosition =
        defaultMarketsEnoughLiquidity[relatedMarket.marketTokenAddress].liquidity;
      result.relatedMarketsPositionStats[relatedMarket.marketTokenAddress] = {
        openFees,
        liquidity: availableUsdLiquidityForPosition,
        isEnoughLiquidity: availableUsdLiquidityForPosition > increaseSizeUsd,
      };
    }
  }

  return result;
});
