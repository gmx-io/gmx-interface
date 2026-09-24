import {
  GMX_SOLANA_CONFIG_ADDRESS,
  GMX_SOLANA_STORE_ADDRESS,
  GMX_SOLANA_TREASURY_VAULT_CONFIG_ADDRESS,
} from '@/config/program';
import {
  NATIVE_TOKEN_ADDRESS,
  WRAPPED_NATIVE_TOKEN_ADDRESS,
} from '@/config/tokens';
import { useTreasuryProgram } from '@/contexts/anchor';
import { filterBalances } from '@/utils/lib/filter';
import { helperToast } from '@/utils/lib/helperToast';
import { isUserRejectedError } from '@/domain/supportChat/tradingErrorTracker';
import { t } from '@lingui/macro';
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
} from '@solana/spl-token';
import {
  AccountMeta,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { findGtBankPDA, STORE_PROGRAM_ID } from 'gmsol';
import { useCallback, useState } from 'react';
import { useSWRConfig } from 'swr';

import { useTriggerInvocation } from '../triggerHooks/useTriggerInvocation';
import { useAvailableGtBanks } from './useAvailableGtBanks';
import { useAvailableGtExchangeUserAccountWithExchangeVaultConfirmation } from './useAvailableGtExchangeUserAccountsWithExchangeVaultConfirmation';
import { useComputeUnits } from '@/hooks/utilsHooks/useComputeUnits';

interface GtClaimParams {
  skipPreflight: boolean;
}

interface TreasuryVaultConfigAccount {
  bump: number;
  index: number;
  padding: number[];
  config: PublicKey;
  reserved: number[];
  tokens: {
    data: {
      key: number[];
      value: {
        flags: {
          value: number;
        };
        reserved: number[];
      };
    }[];
    padding: number[];
    count: number;
  };
}

export function useClaimGtExchangeRewardsInOrder() {
  const treasuryProgram = useTreasuryProgram();
  const { mutate } = useSWRConfig();
  const { gtExchangeUserAccounts } =
    useAvailableGtExchangeUserAccountWithExchangeVaultConfirmation();
  const { gtBanks } = useAvailableGtBanks();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const { computeUnits, computeUnitPrice } = useComputeUnits();

  const mutateStates = useCallback(() => {
    void mutate(filterBalances);
  }, [mutate]);

  const claimSingleReward = useCallback(
    async (
      exchangeAccount: AccountMeta,
      treasuryVaultConfigAccount: TreasuryVaultConfigAccount,
      skipPreflight: boolean
    ): Promise<string> => {
      const owner = treasuryProgram.provider.publicKey;
      const storePubkey = GMX_SOLANA_STORE_ADDRESS;
      const config = GMX_SOLANA_CONFIG_ADDRESS;
      const treasuryVaultConfig = GMX_SOLANA_TREASURY_VAULT_CONFIG_ADDRESS;

      if (!owner || !storePubkey || !config || !treasuryVaultConfig) {
        throw Error('Required configuration missing');
      }

      const vault =
        gtExchangeUserAccounts[exchangeAccount.pubkey.toBase58()].vault;
      const [gtBank] = findGtBankPDA(treasuryVaultConfig, vault);
      if (!gtBank) throw Error('GT bank is not deployed');

      const bank = Object.values(gtBanks).find(
        (bank) => bank.gtExchangeVault.toBase58() === vault.toBase58()
      );
      if (!bank) throw Error('GT bank not found');

      // First get the bank balances to ensure we have the correct token list
      const bankBalances = bank.balances.data
        .slice(0, bank.balances.count)
        .map(({ key }) => new PublicKey(key))
        .sort((a, b) => a.toBase58().localeCompare(b.toBase58()));

      // Then get treasury tokens and ensure they match the bank balances
      const treasuryTokens = treasuryVaultConfigAccount.tokens.data
        .slice(0, treasuryVaultConfigAccount.tokens.count)
        .map((entry) => new PublicKey(entry.key))
        .filter((token) =>
          bankBalances.some((balance) => balance.equals(token))
        )
        .sort((a, b) => a.toBase58().localeCompare(b.toBase58()));

      const remainingAccounts: AccountMeta[] = [];

      // First add all token mints in sorted order
      treasuryTokens.forEach((tokenMint) => {
        const adjustedTokenMint = tokenMint.equals(NATIVE_TOKEN_ADDRESS)
          ? WRAPPED_NATIVE_TOKEN_ADDRESS
          : tokenMint;
        remainingAccounts.push({
          pubkey: adjustedTokenMint,
          isSigner: false,
          isWritable: true,
        });
      });

      // Then add all vault ATAs in the same order
      treasuryTokens.forEach((tokenMint) => {
        const adjustedTokenMint = tokenMint.equals(NATIVE_TOKEN_ADDRESS)
          ? WRAPPED_NATIVE_TOKEN_ADDRESS
          : tokenMint;
        remainingAccounts.push({
          pubkey: getAssociatedTokenAddressSync(
            adjustedTokenMint,
            gtBank,
            true
          ),
          isSigner: false,
          isWritable: true,
        });
      });

      // Finally add all owner ATAs in the same order
      treasuryTokens.forEach((tokenMint) => {
        const adjustedTokenMint = tokenMint.equals(NATIVE_TOKEN_ADDRESS)
          ? WRAPPED_NATIVE_TOKEN_ADDRESS
          : tokenMint;
        remainingAccounts.push({
          pubkey: getAssociatedTokenAddressSync(adjustedTokenMint, owner, true),
          isSigner: false,
          isWritable: true,
        });
      });

      const instruction = await treasuryProgram.methods
        .completeGtExchange()
        .accountsStrict({
          owner,
          store: storePubkey,
          config,
          treasuryVaultConfig,
          gtExchangeVault: vault,
          gtBank,
          exchange: exchangeAccount.pubkey,
          tokenProgram: TOKEN_PROGRAM_ID,
          token2022Program: TOKEN_2022_PROGRAM_ID,
          storeProgram: STORE_PROGRAM_ID,
        })
        .remainingAccounts(remainingAccounts)
        .instruction();

      // Create compute budget instructions
      const computeBudgetInstructions = [];

      if (computeUnits) {
        computeBudgetInstructions.push(
          ComputeBudgetProgram.setComputeUnitLimit({
            units: computeUnits * 2, // Double the compute units as shown in the original code
          })
        );
      }

      if (computeUnitPrice) {
        computeBudgetInstructions.push(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: computeUnitPrice,
          })
        );
      }

      // Create idempotent token account instructions for all required token accounts
      const createAtaInstructions = [];
      for (const tokenMint of treasuryTokens) {
        const adjustedTokenMint = tokenMint.equals(NATIVE_TOKEN_ADDRESS)
          ? WRAPPED_NATIVE_TOKEN_ADDRESS
          : tokenMint;

        // Create token account for the user if it doesn't exist
        createAtaInstructions.push(
          createAssociatedTokenAccountIdempotentInstruction(
            owner,
            getAssociatedTokenAddressSync(adjustedTokenMint, owner, true),
            owner,
            adjustedTokenMint
          )
        );
      }

      const connection = treasuryProgram.provider.connection;
      const recentBlockhash = await connection
        .getLatestBlockhash()
        .then((res) => res.blockhash);

      // Add all instructions including compute budget instructions and token account creation
      const message = new TransactionMessage({
        payerKey: owner,
        recentBlockhash,
        instructions: [
          ...computeBudgetInstructions,
          ...createAtaInstructions,
          instruction,
        ],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(message);

      if (!treasuryProgram.provider.sendAndConfirm) {
        throw new Error('Wallet is not signable');
      }

      return await treasuryProgram.provider.sendAndConfirm(
        transaction,
        undefined,
        {
          skipPreflight,
        }
      );
    },
    [
      treasuryProgram,
      gtExchangeUserAccounts,
      gtBanks,
      computeUnits,
      computeUnitPrice,
    ]
  );

  const invoker = useCallback(
    async ({ skipPreflight }: GtClaimParams): Promise<string> => {
      if (!treasuryProgram.provider.sendAndConfirm) {
        throw Error('Wallet is not signable');
      }

      const treasuryVaultConfig = GMX_SOLANA_TREASURY_VAULT_CONFIG_ADDRESS;
      if (!treasuryVaultConfig) {
        throw Error('Treasury config is not deployed');
      }

      const treasuryVaultConfigAccount =
        (await treasuryProgram.account.treasuryVaultConfig.fetch(
          treasuryVaultConfig
        )) as TreasuryVaultConfigAccount;

      const sortedExchangeAccounts = Object.entries(gtExchangeUserAccounts)
        .sort(([, a], [, b]) =>
          b.vault.toBase58().localeCompare(a.vault.toBase58())
        )
        .map(([address]) => ({
          pubkey: new PublicKey(address),
          isSigner: false,
          isWritable: true,
        }));

      if (sortedExchangeAccounts.length === 0) {
        helperToast.error(t`No confirmed GT exchange accounts found`);
        throw new Error('No confirmed GT exchange accounts found');
      }

      setIsProcessing(true);
      setProgress({ current: 0, total: sortedExchangeAccounts.length });

      try {
        let lastTxHash = '';
        let hasError = false;
        let supportError: unknown;

        for (let i = 0; i < sortedExchangeAccounts.length; i++) {
          try {
            lastTxHash = await claimSingleReward(
              sortedExchangeAccounts[i],
              treasuryVaultConfigAccount,
              skipPreflight
            );
            setProgress({
              current: i + 1,
              total: sortedExchangeAccounts.length,
            });
            mutateStates();
          } catch (error) {
            hasError = true;
            if (supportError === undefined || isUserRejectedError(supportError)) {
              supportError = error;
            }
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error occurred';
            helperToast.error(
              t`Failed to claim reward for account ${i + 1}: ${errorMessage}`
            );
            // Continue with next account despite error
            continue;
          }
        }

        if (hasError) {
          throw Object.assign(new Error(
            'Some rewards failed to claim. Check the error messages above.'
          ), { cause: supportError });
        }

        return lastTxHash;
      } finally {
        setIsProcessing(false);
        setProgress({ current: 0, total: 0 });
      }
    },
    [treasuryProgram, gtExchangeUserAccounts, claimSingleReward, mutateStates]
  );

  const { trigger, isSending } = useTriggerInvocation(
    {
      key: 'claim-gt-rewards-in-order',
      onSentMessage: t`Claiming GT rewards in order...`,
      message: t`GT rewards claimed successfully.`,
    },
    invoker,
    {
      onSuccess: mutateStates,
    }
  );

  return {
    trigger,
    isSending: isSending || isProcessing,
    progress,
  };
}
