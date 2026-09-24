/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useUserAccount } from '@/hooks/fetchHooks/useUserAccount';
import { PublicKey } from '@solana/web3.js';
import { useMemo } from 'react';

export type ReferralDetails = {
  referrer: PublicKey | null;
  referralCode: PublicKey | null;
  refereeCount: number;
  hasSetReferralCode: boolean;
  hasReferrer: boolean;
};

export function useReferralDetails(userKey?: string | null) {
  const { user, isLoading } = useUserAccount(GMX_SOLANA_STORE_ADDRESS);

  const referralDetails = useMemo(() => {
    if (!userKey || !user) return null;

    const defaultPubkey = PublicKey.default;

    return {
      referrer: user.referral.referrer.equals(defaultPubkey)
        ? null
        : user.referral.referrer,
      referralCode: user.referral.code.equals(defaultPubkey)
        ? null
        : user.referral.code,
      refereeCount: user.referral.refereeCount.toNumber(),
      hasSetReferralCode: !user.referral.code.equals(defaultPubkey),
      hasReferrer: !user.referral.referrer.equals(defaultPubkey),
    } as ReferralDetails;
  }, [user, userKey]);

  return {
    referralDetails,
    isLoading,
  };
}
