import { GRAPHQL_ENDPOINT } from '@/config/url';
import { useAnchor } from '@/contexts/anchor';
import { selectGtGlobalDetailsDecimals } from '@/selectors/gt/gtGlobalDetailsSelectors';
import { formatAmount } from '@/utils/legacy/format';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useStoreAccount } from '@/hooks/fetchHooks/useStoreAccount';
import useSWR from 'swr';
import { useMemo } from 'react';

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
  action: 'referral_rewards' | 'mint' | 'sell' | 'stake';
  amount: string;
  amountBN: BN;
}

export const useGtHistoryDataLegacy = (enabled = true) => {
  const { store } = useStoreAccount(GMX_SOLANA_STORE_ADDRESS);
  const gtDecimals = useMemo(() => store?.gt?.decimals, [store?.gt?.decimals]);
  const { owner } = useAnchor();
  const { data, isLoading } = useSWR<GtHistoryItem[]>(
    enabled && owner && gtDecimals ? [GT_HISTORY_KEY, owner.toBase58(), 'legacy'] : null,
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
                  },
                  orderBy: timestamp_DESC
                ) {
                  id
                  timestamp
                  receiverDelta
                  kind
                  receiver
                }
                gtRewardRecords(orderBy: timestamp_DESC) {
                  id
                  source
                  sourceKind
                  timestamp
                }
              }
            `,
          }),
        });

        const result = (await response.json()) as GtUpdateResponse;
        if (!result.data?.gtUpdateds) {
          throw new Error('Invalid response format');
        }
        const rewardRecordsMap = result.data.gtRewardRecords?.reduce((acc, record) => {
          acc[record.id] = record.sourceKind;
          return acc;
        }, {});
        return result.data.gtUpdateds.map(
          (update): GtHistoryItem => ({
            id: update.id,
            timestamp: update.timestamp,
            action:
              rewardRecordsMap[update.id] === 'referral' ? 'referral_rewards' :
              rewardRecordsMap[update.id] === 'custom' ? 'stake' :
              update.kind === 'Burn'
                  ? 'sell'
                  : 'mint',
              amount: formatAmount(
              new BN(update.receiverDelta),
              gtDecimals,
              4,
              true,
              true
            ),
            amountBN: new BN(update.receiverDelta),
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
