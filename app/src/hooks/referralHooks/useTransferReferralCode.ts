import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useAnchor, useStoreProgram } from '@/contexts/anchor';
import { selectSkipPreflight } from '@/selectors/setting/baseSelectors';
import { filterBalances, filterReferralDetails } from '@/utils/lib/filter';
import { useAppStore } from '@/zustand/useAppStore';
import { t } from '@lingui/macro';
import { PublicKey } from '@solana/web3.js';
import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

import { useReferralDetails } from '../fetchHooks/useReferralDetails';
import { useTriggerInvocation } from '../triggerHooks/useTriggerInvocation';

export type TransferReferralCodeParams = {
  receiver: string | PublicKey;
};

export function useTransferReferralCode() {
  const store = useStoreProgram();
  const { owner } = useAnchor();
  const { mutate } = useSWRConfig();
  const { referralDetails } = useReferralDetails();
  const skipPreflight = useAppStore(selectSkipPreflight);

  const mutateStates = useCallback(() => {
    void mutate(filterBalances);
    void mutate(filterReferralDetails);
  }, [mutate]);

  const invoker = useCallback(
    async ({ receiver }: TransferReferralCodeParams) => {
      if (!store || !owner || !referralDetails?.referralCode) {
        throw new Error(
          'Store program not initialized or no referral code found'
        );
      }

      const storeAddress = GMX_SOLANA_STORE_ADDRESS;
      if (!storeAddress) throw new Error('Store address not found');

      try {
        const receiverPubkey =
          typeof receiver === 'string' ? new PublicKey(receiver) : receiver;

        // Get the PDA for the receiver's user account
        const [receiverUserPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('user'),
            storeAddress.toBuffer(),
            receiverPubkey.toBuffer(),
          ],
          store.programId
        );

        // Get the PDA for the current user's account
        const [userPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('user'), storeAddress.toBuffer(), owner.toBuffer()],
          store.programId
        );

        // Transfer referral code using the store program
        const tx = await store.methods
          .transferReferralCode()
          .accountsStrict({
            owner: owner,
            store: storeAddress,
            user: userPda,
            referralCode: referralDetails.referralCode,
            receiverUser: receiverUserPda,
          })
          .rpc({ skipPreflight });

        return tx;
      } catch (error) {
        console.error('Error transferring referral code:', error);
        throw error;
      }
    },
    [store, owner, referralDetails, skipPreflight]
  );

  const { trigger, isSending } = useTriggerInvocation(
    {
      key: 'transfer-referral-code',
      onSentMessage: t`Transferring referral code...`,
      message: t`Referral code transferred.`,
    },
    invoker,
    {
      onSuccess: mutateStates,
    }
  );

  return {
    transfer: trigger,
    isTransferring: isSending,
  };
}

// Example usage:
// const { transfer, isTransferring } = useTransferReferralCode();

// // Later in the code:
// await transfer({ receiver: "someAddress" });
