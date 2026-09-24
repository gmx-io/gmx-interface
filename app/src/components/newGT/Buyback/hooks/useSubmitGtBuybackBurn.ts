import { useCallback, useState } from 'react';
import { BN, translateAddress } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { findGtExchangePDA, findGtExchangeVaultPDA } from 'gmsol';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useStoreProgram } from '@/contexts/anchor';
import { submitGtBuybackBurn } from '../api/keeperBuyback';
import type { GtBuybackBurnSubmitResult } from '../types';
import { uiToRawAmountString } from '../utils/buybackDerivations';

type SubmitParams = {
  /** UI GT amount (human-readable). */
  uiAmount: number;
  gtDecimals: number;
};

/**
 * Builds and signs prepareGtExchangeVault + requestGtExchange locally, then
 * submits to keeper via submitGtBuybackBurn(group: [[base64Tx]]).
 * Does not broadcast burn via .rpc() — keeper validates and broadcasts.
 *
 * Keeper requires `prepare_gt_exchange_vault` in the submitted transaction
 * group (idempotent if vault already exists).
 */
export function useSubmitGtBuybackBurn() {
  const storeProgram = useStoreProgram();
  const { publicKey, signTransaction } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timeWindow = 86400;

  const submit = useCallback(
    async ({
      uiAmount,
      gtDecimals,
    }: SubmitParams): Promise<GtBuybackBurnSubmitResult> => {
      if (!publicKey) throw new Error('Wallet is not connected');
      if (!signTransaction) {
        throw new Error('Wallet does not support signTransaction');
      }
      if (!storeProgram.provider.publicKey) {
        throw new Error('Wallet is not connected');
      }

      const rawAmountStr = uiToRawAmountString(uiAmount, gtDecimals);
      if (rawAmountStr === '0') {
        throw new Error('Amount must be greater than zero');
      }
      const amount = new BN(rawAmountStr);

      const store = GMX_SOLANA_STORE_ADDRESS;
      const owner = storeProgram.provider.publicKey;
      const storePubkey = translateAddress(store);

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const timeWindowIndex = Math.floor(currentTimestamp / timeWindow);

      const [vaultAddress] = findGtExchangeVaultPDA(
        storePubkey,
        BigInt(timeWindowIndex),
        timeWindow
      );
      const [exchangeAddress] = findGtExchangePDA(vaultAddress, owner);

      setIsSubmitting(true);
      try {
        const prepareIx = await storeProgram.methods
          .prepareGtExchangeVault(new BN(timeWindowIndex))
          .accountsStrict({
            payer: owner,
            store: storePubkey,
            vault: vaultAddress,
            systemProgram: SystemProgram.programId,
          })
          .instruction();

        const requestIx = await storeProgram.methods
          .requestGtExchange(amount)
          .accountsPartial({
            store: storePubkey,
            owner,
            vault: vaultAddress,
            exchange: exchangeAddress,
            systemProgram: PublicKey.default,
          })
          .instruction();

        const tx = new Transaction().add(prepareIx, requestIx);
        tx.feePayer = owner;
        const { blockhash } =
          await storeProgram.provider.connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;

        const signed = await signTransaction(tx);
        const base64 = Buffer.from(signed.serialize()).toString('base64');

        const result = await submitGtBuybackBurn({
          store: storePubkey.toBase58(),
          group: [[base64]],
        });

        if (!result.accepted) {
          throw new Error(
            result.sendError || 'Keeper rejected the buyback burn request'
          );
        }
        // accepted + sendError: keeper keeps the request for watcher retry.
        return result;
      } finally {
        setIsSubmitting(false);
      }
    },
    [publicKey, signTransaction, storeProgram, timeWindow]
  );

  return { submit, isSubmitting };
}
