import { useAnchor } from '@/contexts/anchor';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useStoreAccount } from '@/hooks/fetchHooks/useStoreAccount';
import { BN } from '@coral-xyz/anchor';
import useSWR from 'swr';
import { useMemo } from 'react';
import { fetchGtHistoryPage } from './gtHistoryQuery';

const GT_HISTORY_KEY = 'data_store/new_gt_history';

export interface GtHistoryItem {
  id: string;
  timestamp: string;
  action: 'referral_rewards' | 'mint' | 'sell' | 'stake';
  amount: string;
  amountBN: BN;
}

export const useGtHistoryData = (
  page: number = 1,
  pageSize: number = 20,
  selectedActionKeys: string[] = []
) => {
  const { store } = useStoreAccount(GMX_SOLANA_STORE_ADDRESS);
  const gtDecimals = useMemo(() => store?.gt?.decimals, [store?.gt?.decimals]);
  const { owner } = useAnchor();

  const actionKey = selectedActionKeys.slice().sort().join('|');

  const { data, isLoading } = useSWR(
    owner && gtDecimals !== undefined
      ? [GT_HISTORY_KEY, owner.toBase58(), page, pageSize, actionKey, 'paginated']
      : null,
    async ([, ownerAddress]: [string, string, number, number, string]) => {
      try {
        return await fetchGtHistoryPage(
          ownerAddress,
          page,
          pageSize,
          selectedActionKeys,
          gtDecimals!
        );
      } catch (error) {
        console.error('Error fetching GT history:', error);
        return { items: [], hasMore: false };
      }
    },
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  return {
    gtHistory: data?.items ?? [],
    hasMore: data?.hasMore ?? false,
    isLoading,
  };
};
