import useSWR from 'swr';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  fetchPoolsOverviewSquidData,
  type PoolsOverviewSquidParsed,
} from './poolsSquidOverview';

export const POOLS_OVERVIEW_SQUID_REFRESH_MS = 300_000;

export type UsePoolsOverviewSquidDataParams = {
  marketAddresses: string[];
  glvAddresses: string[];
  enabled?: boolean;
};

function sortJoin(addresses: string[]): string {
  return [...addresses].sort().join(',');
}

export function usePoolsOverviewSquidData({
  marketAddresses,
  glvAddresses,
  enabled = true,
}: UsePoolsOverviewSquidDataParams) {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58();

  const marketKey = sortJoin(marketAddresses);
  const glvKey = sortJoin(glvAddresses);

  const swrKey =
    enabled && (marketAddresses.length > 0 || glvAddresses.length > 0)
      ? ['pools/overview-squid', walletAddress ?? '', marketKey, glvKey]
      : null;

  const { data, error, isLoading, mutate } = useSWR<PoolsOverviewSquidParsed, Error>(
    swrKey,
    () =>
      fetchPoolsOverviewSquidData({
        marketAddresses,
        glvAddresses,
        walletAddress,
      }),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      refreshInterval: POOLS_OVERVIEW_SQUID_REFRESH_MS,
      keepPreviousData: true,
    }
  );

  return { data, error, isLoading, mutate };
}
