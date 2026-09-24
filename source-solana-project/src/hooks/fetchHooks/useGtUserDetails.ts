/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useUserAccount } from '@/hooks/fetchHooks/useUserAccount';
import { GtUserDetails } from '@/selectors/gt/types';
import { useMemo } from 'react';

export function useGtUserDetails() {
  const { user, isLoading } = useUserAccount(GMX_SOLANA_STORE_ADDRESS);

  const gtDetails = useMemo(() => {
    if (!user) return null;

    const gtDetails: GtUserDetails = {
      rank: user.gt.rank,
      lastMintedAt: user.gt.lastMintedAt,
      totalMinted: user.gt.totalMinted,
      amount: user.gt.amount,
      paidFeeValue: user.gt.paidFeeValue,
      mintedFeeValue: user.gt.mintedFeeValue,
    };

    return gtDetails;
  }, [user]);

  return {
    gtDetails,
    isLoading,
  };
}
