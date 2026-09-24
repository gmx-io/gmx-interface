import { GRAPHQL_ENDPOINT } from '@/config/url';
import { BN } from '@coral-xyz/anchor';
import useSWR from 'swr';

const TOTAL_STATS_KEY = 'data_store/total_stats';

interface TotalStatsResponse {
  data: {
    totalStats: Array<{
      totalFees: string;
      totalUsers: string;
      totalVolume: string;
      volume24h: string;
      fees24h: string;
      openInterest: string;
    }>;
  };
}

export const useTotalStats = (options?: { enabled?: boolean }) => {
  const enabled = options?.enabled ?? true;
  const { data, isLoading } = useSWR<{
    totalFees: BN;
    totalUsers: BN;
    totalVolume: BN;
    volume24h: BN;
    fees24h: BN;
    openInterest: BN;
  }>(
    enabled ? TOTAL_STATS_KEY : null,
    async () => {
      try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query {
                totalStats {
                  totalFees
                  totalUsers
                  totalVolume
                  fees24h
                  volume24h
                  openInterest
                }
              }
            `,
          }),
        });

        const result = (await response.json()) as TotalStatsResponse;

        if (!result.data?.totalStats?.[0]) {
          throw new Error('Invalid response format');
        }

        const stats = result.data.totalStats[0];
        return {
          totalFees: new BN(stats.totalFees),
          totalUsers: new BN(stats.totalUsers),
          totalVolume: new BN(stats.totalVolume),
          volume24h: new BN(stats.volume24h),
          fees24h: new BN(stats.fees24h),
          openInterest: new BN(stats.openInterest),
        };
      } catch (error) {
        console.error('Error fetching total stats:', error);
        return {
          totalFees: new BN(0),
          totalUsers: new BN(0),
          totalVolume: new BN(0),
          fees24h: new BN(0),
          volume24h: new BN(0),
          openInterest: new BN(0),
        };
      }
    },
    {
      refreshInterval:5000,
      revalidateOnMount: true,

    }
  );

  return {
    totalStats: data ?? {
      fees24h: new BN(0),
      totalFees: new BN(0),
      totalUsers: new BN(0),
      totalVolume: new BN(0),
      volume24h: new BN(0),
      openInterest: new BN(0),
    },
    isLoading,
  };
};
