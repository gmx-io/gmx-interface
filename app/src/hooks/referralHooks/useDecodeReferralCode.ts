/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useStoreProgram } from '@/contexts/anchor';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { useCallback } from 'react';

// New custom hook
export function useDecodeReferralCode() {
  const store = useStoreProgram();

  return useCallback(
    async (publicKey: PublicKey | string): Promise<string> => {
      try {
        // If the input is already a string, return it
        if (typeof publicKey === 'string') {
          return publicKey;
        }

        // If it's a PublicKey, try to fetch the referral code account
        const referralCodeAccount =
          await store.account.referralCodeV2.fetch(publicKey);

        if (!referralCodeAccount) {
          return '';
        }

        // Extract code bytes and convert to string
        const codeBytes = referralCodeAccount.code;

        // Find the first non-zero byte
        let startIndex = 0;
        while (startIndex < codeBytes.length && codeBytes[startIndex] === 0) {
          startIndex++;
        }

        // Extract the actual bytes (without leading zeros) and encode
        const actualBytes = codeBytes.slice(startIndex);
        return actualBytes.length > 0 ? bs58.encode(actualBytes) : '';
      } catch (error) {
        console.error('Failed to decode referral code:', error);
        // Return the public key as string if decoding fails
        return typeof publicKey === 'string' ? publicKey : publicKey.toBase58();
      }
    },
    [store]
  );
}
