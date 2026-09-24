/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useStoreProgram } from '@/contexts/anchor';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { useMemo } from 'react';
import useSWR from 'swr';

export function useReferrerReferralCode(referrer: PublicKey | null) {
  const store = useStoreProgram();

  const fetcher = async (referrerAddress: PublicKey) => {
    if (!store || !GMX_SOLANA_STORE_ADDRESS) return null;

    try {
      // Find the user PDA for the referrer
      const [userPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('user'),
          GMX_SOLANA_STORE_ADDRESS.toBuffer(),
          referrerAddress.toBuffer(),
        ],
        store.programId
      );

      // Fetch the user account
      const userAccount = await store.account.userHeader.fetch(userPda);

      if (!userAccount || userAccount.referral.code.equals(PublicKey.default)) {
        return null;
      }

      // Get and decode the referral code
      const codeBytes = await store.account.referralCodeV2.fetch(
        userAccount.referral.code
      );
      if (!codeBytes) return null;

      // Extract code bytes and convert to string
      const bytes = codeBytes.code;

      // Find the first non-zero byte
      let startIndex = 0;
      while (startIndex < bytes.length && bytes[startIndex] === 0) {
        startIndex++;
      }

      // Extract the actual bytes (without leading zeros) and encode
      const actualBytes = bytes.slice(startIndex);
      return actualBytes.length > 0 ? bs58.encode(actualBytes) : '';
    } catch (error) {
      console.error('Error fetching referrer referral code:', error);
      return null;
    }
  };

  const { data: referralCode, isLoading } = useSWR(
    referrer ? ['referrerReferralCode', referrer.toBase58()] : null,
    () => (referrer ? fetcher(referrer) : null)
  );

  return useMemo(
    () => ({
      referralCode,
      isLoading,
    }),
    [referralCode, isLoading]
  );
}
