/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useStoreProgram } from '@/contexts/anchor';
import { filterBalances } from '@/utils/lib/filter';
import { BN, translateAddress } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { findGtExchangePDA, findGtExchangeVaultPDA } from 'gmsol';
import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

import { useTriggerInvocation } from '../triggerHooks/useTriggerInvocation';

interface GtDepositParams {
  amount: BN;
  skipPreflight: boolean;
}

export function useDepositGtExchangeGt() {
  const storeProgram = useStoreProgram();
  const timeWindow = 86400;
  const { mutate } = useSWRConfig();

  const mutateStates = useCallback(() => {
    void mutate(filterBalances);
  }, [mutate]);

  const invoker = useCallback(
    async ({ amount, skipPreflight }: GtDepositParams): Promise<string> => {
      const store = GMX_SOLANA_STORE_ADDRESS;
      const owner = storeProgram.provider.publicKey;
      if (!owner) throw Error('Wallet is not connected');
      if (!store) throw Error('Store is not deployed');
      const storePubkey = translateAddress(store);

      // Calculate current time window index
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const timeWindowIndex = Math.floor(currentTimestamp / timeWindow);

      // Find PDAs with timeWindowIndex instead of timeWindow
      const [vaultAddress] = findGtExchangeVaultPDA(
        storePubkey,
        BigInt(timeWindowIndex),
        timeWindow
      );
      const [exchangeAddress] = findGtExchangePDA(vaultAddress, owner);

      // Check if vault exists and initialize if needed
      try {
        const vaultAccount =
          await storeProgram.account.gtExchangeVault.fetch(vaultAddress);
        if (!vaultAccount) {
          await storeProgram.methods
            .prepareGtExchangeVault(new BN(timeWindowIndex))
            .accountsStrict({
              payer: owner,
              store: storePubkey,
              vault: vaultAddress,
              systemProgram: SystemProgram.programId,
            })
            .rpc({ skipPreflight });
        }
      } catch (error) {
        await storeProgram.methods
          .prepareGtExchangeVault(new BN(timeWindowIndex))
          .accountsStrict({
            payer: owner,
            store: storePubkey,
            vault: vaultAddress,
            systemProgram: SystemProgram.programId,
          })
          .rpc({ skipPreflight });
      }

      // Proceed with deposit
      const tx = await storeProgram.methods
        .requestGtExchange(amount)
        .accountsPartial({
          store: storePubkey,
          owner,
          vault: vaultAddress,
          exchange: exchangeAddress,
          systemProgram: PublicKey.default,
        })
        .rpc({ skipPreflight });

      return tx;
    },
    [storeProgram, timeWindow]
  );

  const { trigger, isSending } = useTriggerInvocation(
    {
      key: 'deposit-gt',
      onSentMessage: t`Selling GT...`,
      message: t`GT Selling successfully.`,
    },
    invoker,
    {
      onSuccess: mutateStates,
    }
  );

  return { trigger, isSending };
}
