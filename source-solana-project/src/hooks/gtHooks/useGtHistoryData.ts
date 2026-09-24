import { GRAPHQL_ENDPOINT } from '@/config/url';
import { useAnchor } from '@/contexts/anchor';
import { selectGtGlobalDetailsDecimals } from '@/selectors/gt/gtGlobalDetailsSelectors';
import { formatAmount } from '@/utils/legacy/format';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import useSWR from 'swr';

const GT_HISTORY_KEY = 'data_store/gt_history';

interface GtUpdateResponse {
  data: {
    gtUpdateds: Array<{
      id: string;
      timestamp: string;
      receiverDelta: string;
      kind: 'Reward' | 'Mint' | 'Burn';
      receiver: string;
    }>;
  };
}

export interface GtHistoryItem {
  id: string;
  timestamp: string;
  action: 'referral_rewards' | 'mint' | 'sell';
  amount: string;
}

export const useGtHistoryData = () => {
  const gtDecimals = useAppStore(selectGtGlobalDetailsDecimals);
  const { owner } = useAnchor();

  const { data, isLoading } = useSWR<GtHistoryItem[]>(
    owner && gtDecimals ? [GT_HISTORY_KEY, owner.toBase58()] : null,
    async ([, ownerAddress]: [string, string]) => {
      try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query {
                gtUpdateds(
                  where: {
                    receiver_eq: "${String(ownerAddress)}"
                  }
                ) {
                  id
                  timestamp
                  receiverDelta
                  kind
                  receiver
                }
              }
            `,
          }),
        });

        const result = (await response.json()) as GtUpdateResponse;

        if (!result.data?.gtUpdateds) {
          throw new Error('Invalid response format');
        }
        return result.data.gtUpdateds.map(
          (update): GtHistoryItem => ({
            id: update.id,
            timestamp: update.timestamp,
            action:
              update.kind === 'Reward'
                ? 'referral_rewards'
                : update.kind === 'Burn'
                  ? 'sell'
                  : 'mint',
            amount: formatAmount(
              new BN(update.receiverDelta),
              gtDecimals,
              4,
              true,
              true
            ),
          })
        );
      } catch (error) {
        console.error('Error fetching GT history:', error);
        return [];
      }
    },
    {}
  );

  return {
    gtHistory: data ?? [],
    isLoading,
  };
};
