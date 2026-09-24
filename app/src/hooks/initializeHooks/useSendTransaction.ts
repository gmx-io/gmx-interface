import { useAnchorProvider } from '@/contexts/anchor';
import { useTriggerInvocation } from '../triggerHooks/useTriggerInvocation';
import { ConfirmOptions, PublicKey, Transaction } from '@solana/web3.js';
import { useCallback } from 'react';
import { TriggerOptions } from '@/utils/lib/transaction';
import { TransactionInfo } from '@/utils/lib/transaction';

export const useSendTransaction = <T>(
  info: TransactionInfo,
  makeTx: (arg: T, owner: PublicKey) => Transaction,
  opts?: ConfirmOptions & TriggerOptions
) => {
  const provider = useAnchorProvider();
  const invoke = useCallback(
    async (arg: T) => {
      if (provider && provider.publicKey) {
        const commitment = opts?.commitment ?? 'confirmed';
        const tx = makeTx(arg, provider.publicKey);
        tx.recentBlockhash = (
          await provider.connection.getLatestBlockhash()
        ).blockhash;
        const signature = await provider.sendAndConfirm(tx, undefined, {
          ...opts,
          commitment,
        });
        return signature;
      } else {
        throw Error('Wallet is not connected');
      }
    },
    [makeTx, opts, provider]
  );
  return useTriggerInvocation(info, invoke, opts);
};
