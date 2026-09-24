import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useStoreProgram } from '@/contexts/anchor';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { useCallback } from 'react';

export function useCheckReferralCodeExists() {
  const storeProgram = useStoreProgram();

  const checkReferralCode = useCallback(
    async (referralCode: string): Promise<boolean> => {
      if (!storeProgram) throw new Error('Store program not found');
      const storeAddress = GMX_SOLANA_STORE_ADDRESS;
      if (!storeAddress) throw new Error('Store address not found');

      const inputBytes = bs58.decode(referralCode);
      if (inputBytes.length > 12) {
        throw new Error(
          'Referral code too long - must be less than 12 characters'
        );
      }

      const codeBytes = new Uint8Array(8);
      const padding = 8 - inputBytes.length;
      codeBytes.set(inputBytes, padding);
      const codeBytesArray = Array.from(codeBytes);

      const [referralCodePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('referral_code'),
          storeAddress.toBuffer(),
          Buffer.from(codeBytesArray),
        ],
        storeProgram.programId
      );

      try {
        await storeProgram.account.referralCodeV2.fetch(referralCodePda);
        return true;
      } catch {
        return false;
      }
    },
    [storeProgram]
  );

  return { checkReferralCode };
}
