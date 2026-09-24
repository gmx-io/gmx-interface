import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { useSendTransaction } from '@/hooks/initializeHooks';
import { toBigInt } from '@/utils/legacy/parse';
import { filterBalances } from '@/utils/lib/filter';
import { BN } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import {
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { SystemProgram, Transaction } from '@solana/web3.js';
import { useSWRConfig } from 'swr';

export const useWrapNativeToken = (callback: () => void) => {
  const { mutate } = useSWRConfig();
  return useSendTransaction(
    {
      key: 'wrap-native-token',
      onSentMessage: t`Wrapping SOL...`,
      message: t`Wrapped SOL.`,
    },
    (amount: BN, owner) => {
      const address = getAssociatedTokenAddressSync(
        WRAPPED_NATIVE_TOKEN_ADDRESS,
        owner,
        true
      );
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: owner,
          toPubkey: address,
          lamports: toBigInt(amount),
        }),
        createSyncNativeInstruction(address)
      );
      return tx;
    },
    {
      onSuccess: () => {
        callback();
        void mutate(filterBalances);
      },
      onError: () => {
        callback();
      },
    }
  );
};
