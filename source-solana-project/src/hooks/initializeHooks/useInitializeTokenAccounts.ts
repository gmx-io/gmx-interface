import { useSendTransaction } from './useSendTransaction';
import { filterBalances } from '@/utils/lib/filter';
import { t } from '@lingui/macro';
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { ConfirmOptions, PublicKey, Transaction } from '@solana/web3.js';
import { useSWRConfig } from 'swr';

export const useInitializeTokenAccounts = (
  opts: ConfirmOptions = {
    commitment: 'confirmed',
    preflightCommitment: 'processed',
  }
) => {
  const { mutate } = useSWRConfig();

  return useSendTransaction(
    {
      key: 'init-token-accounts',
      onSentMessage: t`Initializing token accounts...`,
      message: t`Initialized token accounts.`,
    },
    (tokens: PublicKey[], owner) => {
      const ixs = tokens.map((token) => {
        const address = getAssociatedTokenAddressSync(token, owner, true);
        return createAssociatedTokenAccountInstruction(
          owner,
          address,
          owner,
          token
        );
      });
      return new Transaction().add(...ixs);
    },
    {
      onSuccess: () => {
        void mutate(filterBalances);
      },
      ...opts,
    }
  );
};
