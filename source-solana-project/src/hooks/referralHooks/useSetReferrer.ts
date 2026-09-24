/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useStoreProgram } from '@/contexts/anchor';
import { selectSkipPreflight } from '@/selectors/setting/baseSelectors';
import { filterReferralDetails, filterUserAccount } from '@/utils/lib/filter';
import { useAppStore } from '@/zustand/useAppStore';
import { t } from '@lingui/macro';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { findUserPDA } from 'gmsol';
import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

import { useTriggerInvocation } from '../triggerHooks/useTriggerInvocation';

interface SetReferrerParams {
  referrerReferralCode: string;
}

export function useSetReferrer() {
  const skipPreflight = useAppStore(selectSkipPreflight);
  const storeProgram = useStoreProgram();
  const { mutate } = useSWRConfig();

  const mutateStates = useCallback(() => {
    void mutate(filterReferralDetails);
    void mutate(filterUserAccount);
  }, [mutate]);

  const invoker = useCallback(
    async ({ referrerReferralCode }: SetReferrerParams): Promise<string> => {
      if (!storeProgram) throw new Error('Store program not found');
      const storeAddress = GMX_SOLANA_STORE_ADDRESS;
      if (!storeAddress) throw new Error('Store address not found');

      const owner = storeProgram.provider.publicKey;
      if (!owner) throw new Error('Wallet not connected');

      // Use the SDK's findUserPDA function
      const [userPda] = findUserPDA(storeAddress, owner);

      // Convert string code to bytes array
      const referralCodeRegex = /^[a-zA-Z0-9_]+$/;
      if (!referralCodeRegex.test(referrerReferralCode)) {
        throw new Error(
          'Referral code can only contain letters, numbers and underscores'
        );
      }

      // Convert to bytes and pad with leading zeros
      const inputBytes = bs58.decode(referrerReferralCode);
      if (inputBytes.length > 12) {
        throw new Error(
          'Referral code too long - must be less than 12 characters'
        );
      }

      const codeBytes = new Uint8Array(8);
      const padding = 8 - inputBytes.length;
      // Copy the actual bytes after the padding
      codeBytes.set(inputBytes, padding);

      // Convert to array for the contract call
      const codeBytesArray = Array.from(codeBytes);

      // Calculate the PDA for referral code account
      const [referralCodePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('referral_code'),
          storeAddress.toBuffer(),
          Buffer.from(codeBytesArray),
        ],
        storeProgram.programId
      );

      // Get referrer user account
      const referralCodeAccount =
        await storeProgram.account.referralCodeV2.fetch(referralCodePda);
      const referrerPubkey = referralCodeAccount.owner;
      const [referrerUserPda] = findUserPDA(storeAddress, referrerPubkey);

      // Check if user account exists
      let needsPrepareUser = false;
      try {
        const userAccount =
          await storeProgram.account.userHeader.fetch(userPda);
        if (!userAccount) {
          needsPrepareUser = true;
        }
      } catch (error) {
        needsPrepareUser = true;
      }

      // Build transaction with combined instructions (single signature)
      const transaction = new Transaction();

      // Add prepareUser instruction if needed
      if (needsPrepareUser) {
        const prepareUserIx = await storeProgram.methods
          .prepareUser()
          .accountsStrict({
            owner: owner,
            store: storeAddress,
            user: userPda,
            systemProgram: SystemProgram.programId,
          })
          .instruction();
        transaction.add(prepareUserIx);
      }

      // Add setReferrer instruction
      const setReferrerIx = await storeProgram.methods
        .setReferrer(codeBytesArray)
        .accountsStrict({
          owner: owner,
          store: storeAddress,
          user: userPda,
          referralCode: referralCodePda,
          referrerUser: referrerUserPda,
        })
        .instruction();
      transaction.add(setReferrerIx);

      // Send transaction with single signature
      const tx = await storeProgram.provider.sendAndConfirm!(transaction, [], {
        skipPreflight,
      });

      return tx;
    },
    [storeProgram, skipPreflight]
  );

  const { trigger, isSending } = useTriggerInvocation(
    {
      key: 'set-referrer',
      onSentMessage: t`Setting referrer...`,
      message: t`Referrer set successfully.`,
    },
    invoker,
    {
      onSuccess: mutateStates,
    }
  );

  return {
    setReferrer: trigger,
    isSettingReferrer: isSending,
  };
}
