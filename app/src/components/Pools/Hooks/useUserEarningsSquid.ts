import { useMemo } from 'react';
import { BN_ZERO } from '@/config/constants';
import { BN } from '@coral-xyz/anchor';
import { usePoolsOverviewSquidData } from './usePoolsOverviewSquidData';
import { usePoolsDetailSquidData } from './usePoolsDetailSquidData';
import type { PoolsSquidOptions } from './poolsSquidTypes';

function sortJoin(addresses: string[]): string {
  return [...addresses].sort().join(',');
}

export type UserEarningsResult = {
  byMarketAddress: {
    [marketAddress: string]: {
      total: BN;
      recent7d: BN;
      expected365d: BN;
    };
  };
  byGlvAddress: {
    [glvAddress: string]: {
      total: BN;
      recent7d: BN;
      expected365d: BN;
    };
  };
  allMarkets: {
    total: BN;
    recent7d: BN;
    expected365d: BN;
    totalAmount: BN;
    recent7dAmount: BN;
  };
  allGlvs: {
    total: BN;
    recent7d: BN;
    expected365d: BN;
  };
};

export function useUserEarningsSquid(
  marketAddresses: string[],
  glvAddresses: string[],
  options?: PoolsSquidOptions
) {
  const squidSource = options?.squidSource ?? 'overview';
  const enabled = options?.enabled !== false;

  const overview = usePoolsOverviewSquidData({
    marketAddresses,
    glvAddresses,
    enabled,
  });

  const detail = usePoolsDetailSquidData({
    marketAddresses,
    glvAddresses,
    poolType: options?.poolType,
    tokenAddress: options?.tokenAddress,
    enabled: enabled && squidSource === 'detail',
  });

  const data =
    squidSource === 'detail'
      ? detail.data?.userEarnings ?? overview.data?.userEarnings
      : overview.data?.userEarnings;

  const marketKey = sortJoin(marketAddresses);
  const glvKey = sortJoin(glvAddresses);

  const defaultData = useMemo(() => {
    const byMarketAddress: {
      [key: string]: { total: BN; recent7d: BN; expected365d: BN };
    } = {};

    marketAddresses.forEach((marketAddress) => {
      byMarketAddress[marketAddress] = {
        total: BN_ZERO,
        recent7d: BN_ZERO,
        expected365d: BN_ZERO,
      };
    });

    const byGlvAddress: {
      [key: string]: { total: BN; recent7d: BN; expected365d: BN };
    } = {};

    glvAddresses.forEach((glvAddress) => {
      byGlvAddress[glvAddress] = {
        total: BN_ZERO,
        recent7d: BN_ZERO,
        expected365d: BN_ZERO,
      };
    });

    return {
      byMarketAddress,
      byGlvAddress,
      allMarkets: {
        total: BN_ZERO,
        recent7d: BN_ZERO,
        expected365d: BN_ZERO,
        totalAmount: BN_ZERO,
        recent7dAmount: BN_ZERO,
      },
      allGlvs: {
        total: BN_ZERO,
        recent7d: BN_ZERO,
        expected365d: BN_ZERO,
      },
    } satisfies UserEarningsResult;
  }, [marketKey, glvKey]);

  return data || defaultData;
}
