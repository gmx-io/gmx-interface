/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useStoreProgram } from '@/contexts/anchor';
import { selectSkipPreflight } from '@/selectors/setting/baseSelectors';
import { filterBalances, filterReferralDetails, filterUserAccount } from '@/utils/lib/filter';
import { helperToast } from '@/utils/lib/helperToast';
import { useAppStore } from '@/zustand/useAppStore';
import { t } from '@lingui/macro';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { findUserPDA } from 'gmsol';
import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

import { useTriggerInvocation } from '../triggerHooks/useTriggerInvocation';

export type InitializeReferralCodeParams = {
  referralCode: string;
};

export function useInitializeReferralCode() {
  const store = useStoreProgram();
  const { mutate } = useSWRConfig();
  const skipPreflight = useAppStore(selectSkipPreflight);

  const mutateStates = useCallback(() => {
    void mutate(filterBalances);
    void mutate(filterReferralDetails);
    void mutate(filterUserAccount);
  }, [mutate]);

  const invoker = useCallback(
    async ({ referralCode }: InitializeReferralCodeParams) => {
      if (!store) throw new Error('Store program not found');
      const storeAddress = GMX_SOLANA_STORE_ADDRESS;
      if (!storeAddress) throw new Error('Store address not found');

      const user = store.provider.publicKey;
      if (!user) {
        helperToast.error(t`Wallet is not connected`);
        throw Error('Wallet is not connected');
      }

      // Use the SDK's findUserPDA function
      const [userPda] = findUserPDA(storeAddress, user);

      // Convert string code to bytes array
      const referralCodeRegex = /^[a-zA-Z0-9_]+$/;
      if (!referralCodeRegex.test(referralCode)) {
        throw new Error(
          'Referral code can only contain letters, numbers and underscores'
        );
      }

      if (referralCode.length > 12) {
        throw new Error(
          'Referral code too long - must be less than 12 characters'
        );
      }

      // Convert to bytes and pad with leading zeros
      const inputBytes = bs58.decode(referralCode);
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
        store.programId
      );

      // Check if user account exists
      let needsPrepareUser = false;
      try {
        const userAccount = await store.account.userHeader.fetch(userPda);
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
        const prepareUserIx = await store.methods
          .prepareUser()
          .accountsStrict({
            owner: user,
            store: storeAddress,
            user: userPda,
            systemProgram: SystemProgram.programId,
          })
          .instruction();
        transaction.add(prepareUserIx);
      }

      // Add initializeReferralCode instruction
      const initializeReferralCodeIx = await store.methods
        .initializeReferralCode(codeBytesArray)
        .accountsStrict({
          owner: user,
          store: storeAddress,
          user: userPda,
          referralCode: referralCodePda,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
      transaction.add(initializeReferralCodeIx);

      // Send transaction with single signature
      const tx = await store.provider.sendAndConfirm!(transaction, [], {
        skipPreflight,
      });

      return tx;
    },
    [store, skipPreflight]
  );

  const { trigger, isSending } = useTriggerInvocation(
    {
      key: 'initialize-referral-code',
      onSentMessage: t`Initializing referral code...`,
      message: t`Referral code initialized.`,
    },
    invoker,
    {
      onSuccess: mutateStates,
    }
  );

  return {
    initialize: trigger,
    isInitializing: isSending,
  };
}

// Example usage:
// const { initialize, isInitializing } = useInitializeReferralCode();

// // Later in the code:
// await initialize({ referralCode: "someCode" });
