import { GRAPHQL_ENDPOINT } from '@/config/url';
import { BN } from '@coral-xyz/anchor';
import useSWR from 'swr';

interface GtUserRankInfo {
  currentRank: number;
  currentUserGt: BN | null;
  nextUserGtDiff: BN | null;
  nextUserAddress: string | null;
}

interface GtRankResponse {
  data: {
    userGtInfos: Array<{
      gt: string;
      gtRank: string;
      id: string;
      nextOwner: string;
      nextUserGtDiff: string;
    }>;
  };
}

export const useGtRankStatForUser = (userAddress?: string) => {
  const { data, isLoading } = useSWR<GtUserRankInfo>(
    userAddress ? ['data_store/gt_rank_stats_for_user', userAddress] : null,
    async () => {
      try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query GetUserGtInfo($userAddress: String!) {
                userGtInfos(where: { id_eq: $userAddress }) {
                  gt
                  gtRank
                  id
                  nextOwner
                  nextUserGtDiff
                }
              }
            `,
            variables: {
              userAddress,
            },
          }),
        });

        const result = (await response.json()) as GtRankResponse;
        const userInfo = result.data?.userGtInfos?.[0];

        // Early return if no data or user has no GT
        if (!result.data || !userInfo) {
          return {
            currentRank: 0,
            currentUserGt: null,
            nextUserGtDiff: null,
            nextUserAddress: null,
          };
        }

        return {
          currentRank: parseInt(userInfo.gtRank),
          currentUserGt: new BN(userInfo.gt),
          nextUserGtDiff:
            userInfo.nextUserGtDiff !== '0'
              ? new BN(userInfo.nextUserGtDiff).abs()
              : null,
          nextUserAddress:
            userInfo.nextOwner !== 'null' ? userInfo.nextOwner : null,
        };
      } catch (error) {
        console.error('Error fetching GT rank stats for user:', error);
        return {
          currentRank: 0,
          currentUserGt: null,
          nextUserGtDiff: null,
          nextUserAddress: null,
        };
      }
    },
    {}
  );

  return {
    userRankInfo: data ?? {
      currentRank: 0,
      currentUserGt: null,
      nextUserGtDiff: null,
      nextUserAddress: null,
    },
    isLoading,
  };
};
