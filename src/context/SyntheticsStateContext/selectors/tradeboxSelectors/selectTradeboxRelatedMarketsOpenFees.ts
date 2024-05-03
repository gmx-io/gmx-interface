import { BigNumber } from "ethers";

import { selectMarketsInfoData, selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  getMarketIncreasePositionAmounts,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxToTokenAddress,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { getCappedPositionImpactUsd, getFeeItem } from "domain/synthetics/fees/utils";
import { getAvailableUsdLiquidityForPosition, isMarketIndexToken } from "domain/synthetics/markets";
import { getAcceptablePriceByPriceImpact, getMarkPrice } from "domain/synthetics/trade/utils/prices";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import {
  MarketStat,
  marketsInfoData2IndexTokenStatsMap,
} from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { values, keyBy, fromPairs } from "lodash";

export type OpenFeesForRelatedMarkets = {
  relatedMarketsPositionStats: {
    [marketTokenAddress: string]: {
      isEnoughLiquidity: boolean;
      liquidity: BigNumber;
      openFees: BigNumber | undefined;
    };
  };
  relatedMarketStats: MarketStat[];
};

export const selectTradeboxRelatedMarketsOpenFees = createSelector((q) => {
  const flags = q(selectTradeboxTradeFlags);
  const indexTokenAddress = q(selectTradeboxToTokenAddress);
  const tokensData = q(selectTokensData);
  const marketsInfoData = q(selectMarketsInfoData);
  const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);
  const increaseSizeUsd = increaseAmounts?.sizeDeltaUsd;

  const indexToken = getByKey(tokensData, indexTokenAddress);

  const { isPosition, isLong } = flags;

  if (!isPosition || !indexToken || isLong === undefined) {
    return {
      relatedMarketsPositionStats: {},
      relatedMarketStats: [],
    } satisfies OpenFeesForRelatedMarkets;
  }

  const allMarkets = Object.values(marketsInfoData || {}).filter((market) => !market.isSpotOnly && !market.isDisabled);

  const relatedMarkets = allMarkets.filter((market) => isMarketIndexToken(market, indexToken.address));

  const relatedMarketStats =
    values(marketsInfoData2IndexTokenStatsMap(keyBy(relatedMarkets, "marketTokenAddress")).indexMap)[0]?.marketsStats ||
    EMPTY_ARRAY;

  const defaultMarketsEnoughLiquidity = fromPairs(
    relatedMarkets.map((market) => {
      const liquidity = getAvailableUsdLiquidityForPosition(market, isLong);
      return [market.marketTokenAddress, { isEnoughLiquidity: liquidity.gt(0), liquidity, openFees: undefined }];
    }),
  );

  const result: OpenFeesForRelatedMarkets = {
    relatedMarketsPositionStats: defaultMarketsEnoughLiquidity,
    relatedMarketStats: relatedMarketStats,
  };

  if (increaseSizeUsd?.gt(0)) {
    for (const relatedMarket of relatedMarkets) {
      const marketIncreasePositionAmounts = getMarketIncreasePositionAmounts(q, relatedMarket.marketTokenAddress);
      if (!marketIncreasePositionAmounts) {
        continue;
      }

      const positionFeeBeforeDiscount = getFeeItem(
        marketIncreasePositionAmounts.positionFeeUsd.add(marketIncreasePositionAmounts.feeDiscountUsd).mul(-1),
        marketIncreasePositionAmounts.sizeDeltaUsd,
      );

      const priceImpactDeltaUsd = getCappedPositionImpactUsd(
        relatedMarket,
        marketIncreasePositionAmounts.sizeDeltaUsd,
        isLong,
      );

      const { acceptablePriceDeltaBps } = getAcceptablePriceByPriceImpact({
        isIncrease: true,
        isLong,
        indexPrice: getMarkPrice({ prices: indexToken.prices, isLong, isIncrease: true }),
        priceImpactDeltaUsd: priceImpactDeltaUsd,
        sizeDeltaUsd: marketIncreasePositionAmounts.sizeDeltaUsd,
      });

      const openFees = positionFeeBeforeDiscount!.bps.add(acceptablePriceDeltaBps);

      const availableUsdLiquidityForPosition =
        defaultMarketsEnoughLiquidity[relatedMarket.marketTokenAddress].liquidity;
      result.relatedMarketsPositionStats[relatedMarket.marketTokenAddress] = {
        openFees,
        liquidity: availableUsdLiquidityForPosition,
        isEnoughLiquidity: availableUsdLiquidityForPosition.gt(increaseSizeUsd),
      };
    }
  }

  return result;
});
