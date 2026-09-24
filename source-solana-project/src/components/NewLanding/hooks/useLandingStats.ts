import { useTotalStats } from '@/hooks/statsHooks/useTotalStats';
import { getGmw248Enabled } from '@/config/featureFlagEnable';
import { formatUsdToKMB } from '@/utils/legacy/format';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { useEffect, useState } from 'react';

type LiquidityValue = string | number | BN;

type LandingMarket = {
  indexToken: string;
  lpLong?: LiquidityValue;
  lpShort?: LiquidityValue;
  longOpenInterest?: LiquidityValue;
  shortOpenInterest?: LiquidityValue;
};

export function useLandingStats() {
  const { totalStats, isLoading } = useTotalStats();
  const { markets } = useAppStore((state) => state.markets);
  const [liquidity, setLiquidity] = useState('...');

  useEffect(() => {
    try {
      if (!markets || !Array.isArray(markets)) {
        throw new Error("'markets' is not a valid array.");
      }

      const landingMarkets = markets as LandingMarket[];

      let total = new BN(0);

      if (getGmw248Enabled()) {
        total = landingMarkets.reduce(
          (sum: BN, item) =>
            sum
              .add(new BN(item.lpLong || 0))
              .add(new BN(item.lpShort || 0))
              .add(new BN(item.longOpenInterest || 0))
              .add(new BN(item.shortOpenInterest || 0)),
          new BN(0)
        );
      } else {
        const uniqueMarkets = Array.from(
          landingMarkets
            .reduce(
              (map, item) => {
                const marketTotal = new BN(item.lpLong || 0).add(
                  new BN(item.lpShort || 0)
                );
                const existing = map.get(item.indexToken);
                if (!existing || marketTotal.gt(existing.total)) {
                  map.set(item.indexToken, { ...item, total: marketTotal });
                }
                return map;
              },
              new Map<string, LandingMarket & { total: BN }>()
            )
            .values()
        );

        total = uniqueMarkets.reduce((sum, item) => sum.add(item.total), total);
      }

      const liquidityTotal = formatUsdToKMB(total, { displayDecimals: 1 });
      if (!total.isZero()) {
        setLiquidity(liquidityTotal);
      }
    } catch (error) {
      console.error('An error occurred while calculating liquidity:', error);
      setLiquidity('$0.00');
    }
  }, [markets]);

  const formatLiquidity = () => {
    if (isLoading) {
      return '...';
    }
    return liquidity.replace(/([bmk])$/i, (m) => m.toUpperCase());
  };

  const formatTraders = () => {
    if (isLoading || totalStats?.totalUsers?.isZero()) {
      return '...';
    }
    return totalStats.totalUsers.toString();
  };

  const formatTotalVolume = () => {
    if (isLoading || totalStats?.totalVolume?.isZero()) {
      return '...';
    }
    const formatted = formatUsdToKMB(totalStats.totalVolume, {
      displayDecimals: 1,
    });
    return formatted.replace(/([bmk])$/i, (m) => m.toUpperCase());
  };

  return {
    isLoading,
    formatLiquidity,
    formatTraders,
    formatTotalVolume,
  };
}
