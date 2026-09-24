import {
  GMX_SOLANA_CONFIG_ADDRESS,
  GMX_SOLANA_STORE_ADDRESS,
  GMX_SOLANA_TREASURY_VAULT_CONFIG_ADDRESS,
} from '@/config/program';
import { useTreasuryProgram } from '@/contexts/anchor';
import { GtBank } from '@/selectors/gt/types';
import { BN } from '@coral-xyz/anchor';
import { BN_ZERO } from '@solana/spl-governance';
import { PublicKey } from '@solana/web3.js';
import { findGtBankPDA, findGtExchangeVaultPDAWithDt } from 'gmsol';
import { useMemo } from 'react';
import useSWR from 'swr';

export const GT_BANK_KEY = 'treasury_program/gt_bank';
export const CONFIG_KEY = 'treasury_program/config';

interface ConfigAccount {
  bump: number;
  store: PublicKey;
  buybackFactor: BN;
}

export const useGtBank = () => {
  const treasuryProgram = useTreasuryProgram();
  const store = GMX_SOLANA_STORE_ADDRESS;
  const treasuryVaultConfig = GMX_SOLANA_TREASURY_VAULT_CONFIG_ADDRESS;
  const config = GMX_SOLANA_CONFIG_ADDRESS;

  // Memoize date and timeWindow
  const currentDate = useMemo(() => new Date(), []); // Only create once
  const timeWindow = useMemo(() => 86400, []); // Bigint constant

  const vault = useMemo(() => {
    if (!store) return undefined;
    return findGtExchangeVaultPDAWithDt(store, currentDate, timeWindow)[0];
  }, [store, currentDate, timeWindow]);
  const gtBankAddress = useMemo(() => {
    if (!treasuryVaultConfig || !vault) return undefined;
    return findGtBankPDA(treasuryVaultConfig, vault)[0];
  }, [treasuryVaultConfig, vault]);

  const request = useMemo(() => {
    if (!gtBankAddress || !config) return null;

    return {
      key: GT_BANK_KEY,
      gtBankAddress: gtBankAddress.toString(),
      configAddress: config.toString(),
    };
  }, [gtBankAddress, config]);
  const transformData = useMemo(() => {
    return async ({
      gtBankAddress,
      configAddress,
    }: {
      gtBankAddress: string;
      configAddress: string;
    }) => {
      const [rawGtBank, rawConfig] = await Promise.all([
        treasuryProgram.account.gtBank.fetch(gtBankAddress),
        treasuryProgram.account.config.fetch(
          configAddress
        ) as Promise<ConfigAccount>,
      ]);
      if (!rawGtBank || !rawConfig) return null;

      const buybackFactor = rawConfig.buybackFactor || BN_ZERO;

      const gtBank: GtBank = {
        bump: rawGtBank.bump,
        flags: {
          value: rawGtBank.flags.value,
        },
        padding: rawGtBank.padding,
        treasuryVaultConfig: rawGtBank.treasuryVaultConfig,
        gtExchangeVault: rawGtBank.gtExchangeVault,
        remainingConfirmedGtAmount: rawGtBank.remainingConfirmedGtAmount,
        balances: {
          count: rawGtBank.balances.count,
          data: rawGtBank.balances.data.map((item) => ({
            key: new PublicKey(item.key).toBase58(),
            value: {
              amount: item.value.amount,
            },
          })),
        },
        buybackFactor,
      };

      return {
        gtBank,
      };
    };
  }, [treasuryProgram]);

  const { isLoading, data } = useSWR(request, transformData, {
    refreshInterval: 1000 * 5,
  });
  return {
    isLoading,
    gtBank: data?.gtBank,
  };
};
