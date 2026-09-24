import { useAnchor } from '@/contexts/anchor';
import { BN_ZERO } from '@/config/constants';
import useSWR from 'swr';
import { fetchGtBurnSoldTotal } from './gtHistoryQuery';

const GT_BURN_SOLD_TOTAL_KEY = 'data_store/new_gt_burn_sold_total';

export const useGtBurnSoldTotal = (enabled = true) => {
  const { owner } = useAnchor();
  const { data, isLoading } = useSWR(
    enabled && owner ? [GT_BURN_SOLD_TOTAL_KEY, owner.toBase58()] : null,
    async ([, ownerAddress]: [string, string]) => {
      try {
        return await fetchGtBurnSoldTotal(ownerAddress);
      } catch (error) {
        console.error('Error fetching GT burn sold total:', error);
        return BN_ZERO;
      }
    },
    { revalidateOnFocus: false }
  );

  return {
    soldBN: data ?? BN_ZERO,
    isLoading,
  };
};
