/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  GMX_SOLANA_CONFIG_ADDRESS,
  GMX_SOLANA_STORE_ADDRESS,
  GMX_SOLANA_TREASURY_VAULT_CONFIG_ADDRESS,
} from '@/config/program';
import { DEFAULT_SWR_REFRESH_INTERVAL_30S } from '@/config/ui';
import { useAnchor, useStoreProgram } from '@/contexts/anchor';
import { useTreasuryProgram } from '@/contexts/anchor';
import { GtBank } from '@/selectors/gt/types';
import { GtExchangeVault } from '@/selectors/gt/types';
import { GtExchangeAccount } from '@/selectors/gt/types';
import { BN } from '@coral-xyz/anchor';
import { BN_ZERO } from '@solana/spl-governance';
import { PublicKey } from '@solana/web3.js';
import {
  findGtBankPDA,
  findGtExchangePDA,
  findGtExchangeVaultPDAWithDt,
} from 'gmsol';
import { useMemo } from 'react';
import useSWR from 'swr';

const GT_COMBINED_KEY = 'gt/combined_data';

interface ConfigAccount {
  bump: number;
  store: PublicKey;
  buybackFactor: BN;
}

/**
 * Combined hook that fetches GT Bank, GT Exchange Vault, and GT Exchange User Account
 * in a single getMultipleAccountsInfo RPC call instead of 3 separate calls.
 */
export const useGtCombinedData = () => {
  const { owner } = useAnchor();
  const storeProgram = useStoreProgram();
  const treasuryProgram = useTreasuryProgram();
  const store = GMX_SOLANA_STORE_ADDRESS;
  const treasuryVaultConfig = GMX_SOLANA_TREASURY_VAULT_CONFIG_ADDRESS;
  const config = GMX_SOLANA_CONFIG_ADDRESS;

  const currentDate = useMemo(() => new Date(), []);
  const timeWindow = useMemo(() => 86400, []);

  const vault = useMemo(() => {
    if (!store) return undefined;
    return findGtExchangeVaultPDAWithDt(store, currentDate, timeWindow)[0];
  }, [store, currentDate, timeWindow]);

  const gtBankAddress = useMemo(() => {
    if (!treasuryVaultConfig || !vault) return undefined;
    return findGtBankPDA(treasuryVaultConfig, vault)[0];
  }, [treasuryVaultConfig, vault]);

  const exchangeAddress = useMemo(() => {
    if (!vault || !owner) return undefined;
    return findGtExchangePDA(vault, owner)[0];
  }, [vault, owner]);

  const request = useMemo(() => {
    if (!gtBankAddress || !config || !vault) return null;
    return {
      key: GT_COMBINED_KEY,
      gtBankAddress: gtBankAddress.toString(),
      configAddress: config.toString(),
      vaultAddress: vault.toString(),
      exchangeAddress: exchangeAddress?.toString() ?? null,
    };
  }, [gtBankAddress, config, vault, exchangeAddress]);

  const { isLoading, data } = useSWR(
    request,
    async ({ gtBankAddress, configAddress, vaultAddress, exchangeAddress }) => {
      const connection = storeProgram.provider.connection;

      // Build address list: [gtBank, config, vault, exchange?]
      const addresses: PublicKey[] = [
        new PublicKey(gtBankAddress),
        new PublicKey(configAddress),
        new PublicKey(vaultAddress),
      ];
      if (exchangeAddress) {
        addresses.push(new PublicKey(exchangeAddress));
      }

      const accountInfos = await connection.getMultipleAccountsInfo(addresses);

      // Decode GT Bank (index 0) + Config (index 1) using treasury coder
      let gtBank: GtBank | null = null;
      const gtBankInfo = accountInfos[0];
      const configInfo = accountInfos[1];
      if (gtBankInfo && configInfo) {
        try {
          const rawGtBank = treasuryProgram.coder.accounts.decode('gtBank', gtBankInfo.data);
          const rawConfig = treasuryProgram.coder.accounts.decode<ConfigAccount>('config', configInfo.data);
          if (rawGtBank && rawConfig) {
            gtBank = {
              bump: rawGtBank.bump,
              flags: { value: rawGtBank.flags.value },
              padding: rawGtBank.padding,
              treasuryVaultConfig: rawGtBank.treasuryVaultConfig,
              gtExchangeVault: rawGtBank.gtExchangeVault,
              remainingConfirmedGtAmount: rawGtBank.remainingConfirmedGtAmount,
              balances: {
                count: rawGtBank.balances.count,
                data: rawGtBank.balances.data.map((item: any) => ({
                  key: new PublicKey(item.key).toBase58(),
                  value: { amount: item.value.amount },
                })),
              },
              buybackFactor: rawConfig.buybackFactor || BN_ZERO,
            };
          }
        } catch (e) {
          console.error('Error decoding GT Bank / Config:', e);
        }
      }

      // Decode GT Exchange Vault (index 2) using store coder
      let gtExchangeVault: GtExchangeVault | null = null;
      const vaultInfo = accountInfos[2];
      if (vaultInfo) {
        try {
          const rawVault = storeProgram.coder.accounts.decode('gtExchangeVault', vaultInfo.data);
          if (rawVault) {
            gtExchangeVault = {
              bump: rawVault.bump,
              flags: { value: rawVault.flags.value },
              padding: rawVault.padding,
              ts: rawVault.ts,
              timeWindow: rawVault.timeWindow,
              amount: rawVault.amount,
              store: rawVault.store,
            };
          }
        } catch (e) {
          console.error('Error decoding GT Exchange Vault:', e);
        }
      }

      // Decode GT Exchange User Account (index 3) using store coder
      let gtExchangeUserAccount: GtExchangeAccount | null = null;
      if (exchangeAddress && accountInfos[3]) {
        try {
          const rawExchange = storeProgram.coder.accounts.decode('gtExchange', accountInfos[3].data);
          if (rawExchange) {
            gtExchangeUserAccount = {
              amount: rawExchange.amount,
              owner: rawExchange.owner,
              store: rawExchange.store,
              vault: rawExchange.vault,
            };
          }
        } catch (e) {
          // Account may not exist yet — this is expected
          console.error('Error decoding GT Exchange User Account:', e);
        }
      }

      return { gtBank, gtExchangeVault, gtExchangeUserAccount };
    },
    {
      refreshInterval: DEFAULT_SWR_REFRESH_INTERVAL_30S,
    }
  );

  return {
    isLoading,
    gtBank: data?.gtBank ?? null,
    gtExchangeVault: data?.gtExchangeVault ?? null,
    gtExchangeUserAccount: data?.gtExchangeUserAccount ?? null,
  };
};
