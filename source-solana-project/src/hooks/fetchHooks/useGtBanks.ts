import {
  GMX_SOLANA_CONFIG_ADDRESS,
  GMX_SOLANA_STORE_ADDRESS,
  GMX_SOLANA_TREASURY_VAULT_CONFIG_ADDRESS,
} from '@/config/program';
import { useTreasuryProgram } from '@/contexts/anchor';
import { PublicKey } from '@solana/web3.js';
import { findGtBankPDA, findGtExchangeVaultPDAWithDt } from 'gmsol';
import { useMemo } from 'react';
import useSWR from 'swr';
import { GTBankItem } from '../competition/useCompetitionVol';

export const GT_BANK_KEY = 'treasury_program/gt_bank';
export const CONFIG_KEY = 'treasury_program/config';

export const useGtBanks = (dates: Date[]) => {
  const treasuryProgram = useTreasuryProgram();

  const store = GMX_SOLANA_STORE_ADDRESS;
  const treasuryVaultConfig = GMX_SOLANA_TREASURY_VAULT_CONFIG_ADDRESS;
  const config = GMX_SOLANA_CONFIG_ADDRESS;
  const timeWindow = useMemo(() => 86400, []); // Bigint constant

  // Generate all vault addresses and gtBank addresses for the given dates
  const vaultsAndBanks = useMemo(() => {
    if (!store || !treasuryVaultConfig) return [];

    return dates.map((date) => {
      const vault = findGtExchangeVaultPDAWithDt(store, date, timeWindow)[0];
      const gtBankAddress = findGtBankPDA(treasuryVaultConfig, vault)[0];
      return {
        date,
        vault,
        gtBankAddress,
      };
    });
  }, [store, treasuryVaultConfig, dates, timeWindow]);

  const requests = useMemo(() => {
    if (!config) return [];

    return vaultsAndBanks.map(({ gtBankAddress, date }) => ({
      key: `${GT_BANK_KEY}/${date.getTime()}`,
      gtBankAddress: gtBankAddress.toString(),
      date,
    }));
  }, [vaultsAndBanks, config]);

  const transformData = useMemo(() => {
    return async ({
      gtBankAddress,
      date,
    }: {
      gtBankAddress: string;
      date: Date;
    }) => {
      // const gtBankList = await treasuryProgram.account.gtBank.all()
      // console.log('gtBankList', {gtBankList});
      // const rawGtBank = gtBankList[0].account
      let rawGtBank;
      try {
        rawGtBank = await treasuryProgram.account.gtBank.fetch(gtBankAddress);
      } catch (error) {
        console.log('get gtbank error', error);
      }
      // console.log('gtbank', {
      //   rawGtBank,
      //   date
      // })
      if (!rawGtBank) return null;
      const gtBank = {
        date: date,
        balances: rawGtBank.balances.data.map((item) => ({
          key: new PublicKey(item.key).toBase58(),
          amount: item.value.amount,
          receiverVaultOut: item.value.receiverVaultOut,
        })),
      } as GTBankItem;

      return gtBank;
    };
  }, [treasuryProgram]);

  // Use SWR's useSWR for each request
  const { data, isLoading } = useSWR(
    requests.length > 0 ? requests : null,
    async (reqs) => {
      const data = await Promise.all(
        reqs.map(async (req) => {
          return (await transformData(req)) || { balances: [], date: req.date };
        })
      );
      console.log('get gtbank data', data);
      return data;
    },
    {
      refreshInterval: 6000,
    }
  );

  return {
    isLoading: isLoading,
    gtBanks: data,
  };
};
