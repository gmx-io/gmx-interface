import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { getMarketOpenInterestPercentage } from '@/utils/market/getMarketOpenInterestPercentage';
import { getMarketFundingRatePerSecond } from '@/utils/market/getMarketFundingRatePerSecond';
import { getMarketAvailableLiquidityUsd } from '@/utils/market/getMarketAvailableLiquidityUsd';
import { BN_ZERO, ONE_USD } from '@/config/constants';
import { MarketTokensStat } from './types';

export const selectMarketTokensStat = createAppStoreSelector(
  [selectMarketsInfo],
  (marketsInfo): MarketTokensStat => {
    const marketTokensStat: MarketTokensStat = {};

    for (const [marketTokenAddress, marketInfo] of Object.entries(
      marketsInfo
    )) {
      const longMarketOpenInterest =
        marketInfo.openInterestForLongLongTokenAmount.add(
          marketInfo.openInterestForLongShortTokenAmount
        );
      const shortMarketOpenInterest =
        marketInfo.openInterestForShortLongTokenAmount.add(
          marketInfo.openInterestForShortShortTokenAmount
        );
      const totalMarketOpenInterest = longMarketOpenInterest.add(
        shortMarketOpenInterest
      );

      const longMarketOpenInterestPercentage = getMarketOpenInterestPercentage(
        longMarketOpenInterest,
        totalMarketOpenInterest
      );
      const shortMarketOpenInterestPercentage = getMarketOpenInterestPercentage(
        shortMarketOpenInterest,
        totalMarketOpenInterest
      );

      const longBorrowingRatePerSecond =
        marketInfo?.borrowingFactorPerSecondForLong?.neg() ?? BN_ZERO;
      const shortBorrowingRatePerSecond =
        marketInfo?.borrowingFactorPerSecondForShort?.neg() ?? BN_ZERO;

      const { longFundingRatePerSecond, shortFundingRatePerSecond } =
        getMarketFundingRatePerSecond(
          longMarketOpenInterest,
          shortMarketOpenInterest,
          marketInfo.fundingFactorPerSecond
        );

      const longNetRatePerSecond = longBorrowingRatePerSecond?.add(
        longFundingRatePerSecond
      );
      const shortNetRatePerSecond = shortBorrowingRatePerSecond?.add(
        shortFundingRatePerSecond
      );

      const longPendingPnl = marketInfo.pendingPnlForLong ?? BN_ZERO;
      const shortPendingPnl = marketInfo.pendingPnlForShort ?? BN_ZERO;

      const marketUsedLiquidity = longMarketOpenInterest.add(
        shortMarketOpenInterest
      );

      const { longMarketAvailableLiquidity, shortMarketAvailableLiquidity } =
        getMarketAvailableLiquidityUsd(marketInfo);

      const marketMaxLiquidity = longMarketAvailableLiquidity.add(
        shortMarketAvailableLiquidity
      );

      const poolValueUsd =
        marketInfo.poolValueWithoutPnlForLong?.add(
          marketInfo?.poolValueWithoutPnlForShort ?? BN_ZERO
        ) ?? BN_ZERO;

      const poolUtilization = poolValueUsd?.isZero()
        ? BN_ZERO
        : marketUsedLiquidity.mul(ONE_USD).div(poolValueUsd ?? BN_ZERO);

      marketTokensStat[marketTokenAddress] = {
        marketInfo,
        longMarketOpenInterest,
        shortMarketOpenInterest,
        totalMarketOpenInterest,
        longMarketOpenInterestPercentage,
        shortMarketOpenInterestPercentage,
        longBorrowingRatePerSecond,
        shortBorrowingRatePerSecond,
        longFundingRatePerSecond,
        shortFundingRatePerSecond,
        longNetRatePerSecond,
        shortNetRatePerSecond,
        longPendingPnl,
        shortPendingPnl,
        marketUsedLiquidity,
        longMarketAvailableLiquidity,
        shortMarketAvailableLiquidity,
        marketMaxLiquidity,
        poolValueUsd,
        poolUtilization,
      };
    }

    return marketTokensStat;
  }
);
