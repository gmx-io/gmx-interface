import { useAnchor } from '@/contexts/anchor';
import { selectGtUserDetailsTotalMinted } from '@/selectors/gt/gtUserDetailsSelectors';
import { useAppStore } from '@/zustand/useAppStore';
import { BN_ZERO } from '@/config/constants';
import { BN } from '@coral-xyz/anchor';
import useSWR from 'swr';
import { fetchGtRewardEarnedTotals } from './gtHistoryQuery';

const GT_EARNED_TOTALS_KEY = 'data_store/new_gt_earned_totals';

export interface GtEarnedTotals {
  tradingBN: BN;
  referralBN: BN;
  stakeBN: BN;
}

export const useGtEarnedTotals = (enabled = true) => {
  const tradingBN = useAppStore(selectGtUserDetailsTotalMinted);
  const { owner } = useAnchor();

  const { data, isLoading } = useSWR(
    enabled && owner ? [GT_EARNED_TOTALS_KEY, owner.toBase58()] : null,
    async ([, ownerAddress]: [string, string]) => {
      try {
        return await fetchGtRewardEarnedTotals(ownerAddress);
      } catch (error) {
        console.error('Error fetching GT earned totals:', error);
        return {
          referralBN: BN_ZERO,
          stakeBN: BN_ZERO,
        };
      }
    },
    { revalidateOnFocus: false }
  );

  return {
    earnedTotals: {
      tradingBN,
      referralBN: data?.referralBN ?? BN_ZERO,
      stakeBN: data?.stakeBN ?? BN_ZERO,
    } satisfies GtEarnedTotals,
    isLoading,
  };
};
