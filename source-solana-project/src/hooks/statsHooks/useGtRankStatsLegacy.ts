import { GRAPHQL_ENDPOINT } from '@/config/url';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import useSWR from 'swr';

interface GtUserInfo {
  gt: BN;
  fees: BN;
  volume: BN;
  owner: PublicKey;
  lastLoginTime: string;
}

interface GtRankResponse {
  data: {
    users: Array<{
      gt: string;
      fees: string;
      volume: string;
      owner: string;
      lastLoginTime: string;
    }>;
  };
}

export const useGtRankStatsLegacy = (enabled = true) => {
  const { data, isLoading } = useSWR<{
    userRanks: GtUserInfo[];
  }>(
    enabled ? 'data_store/gt_rank_stats_legacy' : null,
    async () => {
      try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query {
                users(where: {gt_gt: "0"}) {
                  gt
                  fees
                  volume
                  owner
                  lastLoginTime
                }
              }
            `,
          }),
        });

        const result = (await response.json()) as GtRankResponse;

        if (!result.data?.users) {
          throw new Error('Invalid response format');
        }

        const userRanks = result.data.users
          .map((user) => ({
            gt: new BN(user.gt),
            fees: new BN(user.fees),
            volume: new BN(user.volume),
            owner: new PublicKey(user.owner),
            lastLoginTime: user.lastLoginTime,
          }))
          .sort((a, b) => {
            const diff = b.gt.sub(a.gt);
            return diff.isZero() ? 0 : diff.isNeg() ? -1 : 1;
          });

        return {
          userRanks,
        };
      } catch (error) {
        console.error('Error fetching GT rank stats:', error);
        return {
          userRanks: [],
        };
      }
    },
    {}
  );

  return {
    gtRankStats: data ?? {
      userRanks: [],
    },
    isLoading,
  };
};
