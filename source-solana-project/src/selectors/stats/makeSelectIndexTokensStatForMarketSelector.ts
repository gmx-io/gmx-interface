import { createAppStoreSelector } from '@/zustand/useAppStore';
import { BN_ZERO, BN_TWO } from '@/config/constants';
import { selectAvailableChartTokens } from '@/selectors/chart/selectAvailableChartTokens';
import { selectIndexTokensStat } from '@/selectors/stats/selectIndexTokensStat';
import { selectMarketTokensStat } from '@/selectors/stats/selectMarketTokensStat';
import { getMarketMidPrice } from '@/utils/market/getMarketMidPrice';
import { getMarketOpenInterestUsd } from '@/utils/market/getMarketOpenInterestUsd';
import { getTradeMaxLeverage } from '@/utils/tradebox/getTradeMaxLeverage';
import { formatUsdToKMB } from '@/utils/legacy/format';
import { BN } from '@coral-xyz/anchor';
import { IndexTokensStatForMarketSelector } from './types';

export const makeSelectIndexTokensStatForMarketSelector = (
  marketVolumesData: Record<string, { volume24h: BN }>
) =>
  createAppStoreSelector(
    [selectAvailableChartTokens, selectMarketTokensStat, selectIndexTokensStat],
    (
      availableIndexTokens,
      marketsStat,
      indexTokensStat
    ): IndexTokensStatForMarketSelector => {
      return availableIndexTokens.reduce((acc, indexToken) => {
        const lastPrice = getMarketMidPrice(indexToken.prices);
        const marketStats = Object.values(marketsStat).filter((stat) =>
          stat.marketInfo.indexTokenAddress.equals(indexToken.address)
        );

        const volume24h = marketStats.reduce((total, stat) => {
          const marketVolume =
            marketVolumesData[stat.marketInfo.marketTokenAddress.toBase58()]
              ?.volume24h ?? BN_ZERO;
          return total.add(marketVolume);
        }, BN_ZERO);

        const longOpenInterest = marketStats.reduce(
          (total, stat) =>
            total.add(getMarketOpenInterestUsd(stat.marketInfo, true)),
          BN_ZERO
        );
        const shortOpenInterest = marketStats.reduce(
          (total, stat) =>
            total.add(getMarketOpenInterestUsd(stat.marketInfo, false)),
          BN_ZERO
        );

        const longOIValue = formatUsdToKMB(longOpenInterest);
        const shortOIValue = formatUsdToKMB(shortOpenInterest);

        const maxLongShortLiquidityPoolData =
          indexTokensStat[indexToken.address.toBase58()];
        const { maxLongLiquidityPool, maxShortLiquidityPool } =
          maxLongShortLiquidityPoolData || {};

        const change24h = indexToken.prices?.change24h || 0;

        const maxLeverage = marketStats.reduce((maxLev, stat) => {
          const longLeverage = getTradeMaxLeverage(
            stat.marketInfo.minCollateralFactor,
            stat.marketInfo.minCollateralFactorForOpenInterestMultiplierForLong,
            stat.marketInfo.openInterestForLongLongTokenAmount
          ).div(BN_TWO);

          const shortLeverage = getTradeMaxLeverage(
            stat.marketInfo.minCollateralFactor,
            stat.marketInfo
              .minCollateralFactorForOpenInterestMultiplierForShort,
            stat.marketInfo.openInterestForShortLongTokenAmount
          ).div(BN_TWO);

          const marketMaxLeverage = BN.max(longLeverage, shortLeverage);
          return BN.max(maxLev, marketMaxLeverage);
        }, BN_ZERO);

        acc[indexToken.address.toBase58()] = {
          indexToken,
          lastPrice,
          longOIValue,
          shortOIValue,
          longOpenInterest,
          shortOpenInterest,
          change24h,
          volume24h,
          maxLeverage,
          maxLongLiquidityPool,
          maxShortLiquidityPool,
          gtEnabledForIndexToken:
            maxLongShortLiquidityPoolData?.gtEnabledForIndexToken ?? false,
        };

        return acc;
      }, {} as IndexTokensStatForMarketSelector);
    }
  );
