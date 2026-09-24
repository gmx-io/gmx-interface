import { GMX_SOLANA_TREASURY_VAULT_CONFIG_ADDRESS } from '@/config/program';
import { useTreasuryProgram } from '@/contexts/anchor';
import { GtBank, GtBanks } from '@/selectors/gt/types';
import { BN_ZERO } from '@solana/spl-governance';
import { PublicKey } from '@solana/web3.js';
import { findGtBankPDA } from 'gmsol';
import { useMemo } from 'react';
import useSWR from 'swr';

import { useAvailableGtExchangeVaults } from './useAvailableGtExchangeVaults';

export const AVAILABLE_GT_BANKS_KEY = 'treasury_program/available_gt_banks';

export const useAvailableGtBanks = () => {
  const treasuryProgram = useTreasuryProgram();
  const treasuryVaultConfig = GMX_SOLANA_TREASURY_VAULT_CONFIG_ADDRESS;
  const { gtExchangeVaults } = useAvailableGtExchangeVaults();

  // Memoize bank addresses calculation
  const bankAddresses = useMemo(() => {
    if (!treasuryVaultConfig) return undefined;

    const addresses = Object.entries(gtExchangeVaults)
      .map(([vaultAddress]) => {
        try {
          const [address] = findGtBankPDA(
            treasuryVaultConfig,
            new PublicKey(vaultAddress)
          );
          return address;
        } catch {
          return null;
        }
      })
      .filter((address): address is PublicKey => address !== null);

    return addresses.length > 0 ? addresses : undefined;
  }, [treasuryVaultConfig, gtExchangeVaults]);

  // Memoize request object
  const request = useMemo(() => {
    if (!bankAddresses) return null;
    return {
      key: AVAILABLE_GT_BANKS_KEY,
      bankAddresses: bankAddresses.map((address) => address.toString()),
    };
  }, [bankAddresses]);

  const { isLoading, data } = useSWR(request, async ({ bankAddresses }) => {
    const bankPromises = bankAddresses.map(async (address) => {
      try {
        const rawBank = await treasuryProgram.account.gtBank.fetch(address);

        if (!rawBank) return null;

        const gtBank: GtBank = {
          bump: rawBank.bump,
          flags: {
            value: rawBank.flags.value,
          },
          padding: rawBank.padding,
          treasuryVaultConfig: rawBank.treasuryVaultConfig,
          gtExchangeVault: rawBank.gtExchangeVault,
          remainingConfirmedGtAmount: rawBank.remainingConfirmedGtAmount,
          balances: {
            count: rawBank.balances.count,
            data: rawBank.balances.data.map((item) => ({
              key: new PublicKey(item.key).toBase58(),
              value: {
                amount: item.value.amount,
              },
            })),
          },
          buybackFactor: BN_ZERO, // To comply with the type
        };

        return { address, bank: gtBank };
      } catch (error) {
        return null;
      }
    });

    const results = await Promise.all(bankPromises);

    return results.reduce((acc, result) => {
      if (result) {
        acc[result.address] = result.bank;
      }
      return acc;
    }, {} as GtBanks);
  });

  return {
    isLoading,
    gtBanks: data || {},
  };
};
