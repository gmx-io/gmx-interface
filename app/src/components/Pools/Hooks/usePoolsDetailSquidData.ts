import useSWR from 'swr';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  fetchPoolsDetailSquidData,
  type PoolsDetailSquidParsed,
} from './poolsSquidDetail';
import { useEffect } from 'react';

export const POOLS_DETAIL_SQUID_REFRESH_MS = 300_000;

type PoolType = 'GLV' | 'GM';

export type UsePoolsDetailSquidDataParams = {
  marketAddresses: string[];
  glvAddresses: string[];
  poolType?: PoolType;
  tokenAddress?: string;
  enabled?: boolean;
};

function sortJoin(addresses: string[]): string {
  return [...addresses].sort().join(',');
}

export function usePoolsDetailSquidData({
  marketAddresses,
  glvAddresses,
  poolType,
  tokenAddress,
  enabled = true,
}: UsePoolsDetailSquidDataParams) {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58();

  const marketKey = sortJoin(marketAddresses);
  const glvKey = sortJoin(glvAddresses);

  const hasAddresses = marketAddresses.length > 0 || glvAddresses.length > 0;
  const shouldFetch = Boolean(enabled && poolType && tokenAddress && hasAddresses);
  const swrKey = shouldFetch
    ? [
        'pools/detail-squid',
        walletAddress ?? '',
        poolType,
        tokenAddress,
        marketKey,
        glvKey,
      ]
    : null;
  
  const { data, error, isLoading, mutate } = useSWR<PoolsDetailSquidParsed, Error>(
    swrKey,
    () =>
      fetchPoolsDetailSquidData({
        marketAddresses,
        glvAddresses,
        walletAddress,
        poolType: poolType,
        tokenAddress: tokenAddress,
      }),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      refreshInterval: POOLS_DETAIL_SQUID_REFRESH_MS,
      keepPreviousData: true,
    }
  );

  useEffect(() => {
    console.log('swrKey, isLoading:', swrKey, isLoading);
    
  }, [swrKey, isLoading])

  return { data, error, isLoading, mutate };
}
