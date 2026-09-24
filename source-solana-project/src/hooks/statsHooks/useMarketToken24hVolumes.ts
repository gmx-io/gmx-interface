import { DEFAULT_SWR_REFRESH_INTERVAL_15S } from '@/config/ui';
import { GRAPHQL_ENDPOINT } from '@/config/url';
import { selectMarketTokensData } from '@/selectors/token/selectMarketTokensData';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import useSWR from 'swr';

export const MARKET_24H_VOLUMES_KEY = 'data_store/market_24h_volumes';

type UseMarketToken24hVolumesOptions = {
  enabled?: boolean;
  refreshInterval?: number;
};

interface MarketTotalStatsResponse {
  data: {
    marketTotalStats: Array<{
      id: string;
      volume24h: string;
    }>;
  };
}

export type MarketVolumesResult = {
  [marketTokenAddress: string]: {
    volume24h: BN;
    isLoading: boolean;
  };
};

export const useMarketToken24hVolumes = (
  options: UseMarketToken24hVolumesOptions = {}
) => {
  const { enabled = true, refreshInterval = DEFAULT_SWR_REFRESH_INTERVAL_15S } =
    options;
  const marketTokensData = useAppStore(selectMarketTokensData);
  const marketAddresses = Object.keys(marketTokensData);

  const { data, isLoading } = useSWR<MarketVolumesResult>(
    enabled ? MARKET_24H_VOLUMES_KEY : null,
    async () => {
      try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query {
                marketTotalStats {
                  id
                  volume24h
                }
              }
            `,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = (await response.json()) as MarketTotalStatsResponse;

        if (!result.data?.marketTotalStats) {
          throw new Error('Invalid response format');
        }

        // Initialize result object with zero volumes for all markets
        const marketVolumes: MarketVolumesResult = {};
        marketAddresses.forEach((address) => {
          marketVolumes[address] = {
            volume24h: new BN(0),
            isLoading: false,
          };
        });

        // Update volumes from marketTotalStats
        result.data.marketTotalStats.forEach((stat) => {
          if (marketVolumes[stat.id]) {
            marketVolumes[stat.id].volume24h = new BN(stat.volume24h || '0');
          }
        });

        return marketVolumes;
      } catch (error) {
        console.error('Error fetching 24h market volumes:', error);
        return marketAddresses.reduce((acc, address) => {
          acc[address] = {
            volume24h: new BN(0),
            isLoading: false,
          };
          return acc;
        }, {} as MarketVolumesResult);
      }
    },
    {
      refreshInterval: enabled ? refreshInterval : 0,
    }
  );

  return {
    marketVolumesData:
      data ??
      marketAddresses.reduce((acc, address) => {
        acc[address] = {
          volume24h: new BN(0),
          isLoading: true,
        };
        return acc;
      }, {} as MarketVolumesResult),
    isLoading,
  };
};
