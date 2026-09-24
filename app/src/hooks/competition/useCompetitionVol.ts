import { useEffect, useMemo } from 'react';
import { useGtBanks } from '../fetchHooks/useGtBanks';
import { getDatesBetween } from '@/utils';
import dayjs from 'dayjs';
import { BN } from '@coral-xyz/anchor';
import { selectMarketsInfo } from '@/selectors/market/selectMarketsInfo';
import { useAppStore } from '@/zustand/useAppStore';
import { selectPrices } from '@/selectors/token/baseSelectors';
import { GMX_SOLANA_TOKENS } from '@/config/program';
import { BN_ZERO } from '@/config/constants';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';

import { useMarkets } from '@/hooks/fetchHooks';

export type GTBankItemBalances = {
  key: string;
  amount: BN;
  receiverVaultOut: BN;
};
export type GTBankItem = {
  date: Date;
  balances: GTBankItemBalances[];
};

const useCompetitionVol = (competitionInfo?: {
  startTime: string;
  endTime: string;
  treasuryPriceFactor: number;
  basePrize: BN;
}) => {
  useMarkets({ enableRefresh: true });
  const marketsInfo = useAppStore(selectMarketsInfo);
  const prices = useAppStore(selectPrices);

  const isCompetitionRuning = useMemo(() => {
    if (!competitionInfo?.startTime || !competitionInfo?.endTime) return false;
    // if nowtime gt endTime and lt startTime, return true
    return (
      dayjs().isAfter(
        dayjs(Number(competitionInfo.startTime) * 1000)
          .utc()
          .startOf('day')
      ) &&
      dayjs().isBefore(
        dayjs(Number(competitionInfo.endTime) * 1000)
          .utc()
          .endOf('day')
      )
    );
  }, [competitionInfo?.endTime, competitionInfo?.startTime]);

  const competitionDateRange = useMemo(() => {
    if (!competitionInfo) return [new Date(0)];
    const dates = getDatesBetween(
      Number(competitionInfo.startTime) * 1000,
      Number(competitionInfo.endTime) * 1000
    );
    return [...dates]; // , new Date('2025-07-06 08:00:00')
  }, [competitionInfo]);

  const { gtBanks } = useGtBanks(competitionDateRange);

  const receiverVaultOut = useMemo(() => {
    if (!competitionInfo || !gtBanks || !gtBanks.length) return BN_ZERO;
    const totalUsd = gtBanks.reduce((acc, gtBank) => {
      const gtBankTotal = gtBank.balances.reduce(
        (child_acc: BN, balance: GTBankItemBalances) => {
          const tokenAddress = balance.key;
          const decimals = GMX_SOLANA_TOKENS?.[tokenAddress]?.decimals;
          const price = prices?.[balance.key]?.minPrice;
          const receiverVaultOutUSD = convertTokenAmountToUsd(
            balance.receiverVaultOut,
            decimals,
            price
          );
          return child_acc.add(receiverVaultOutUSD);
        },
        BN_ZERO
      );
      return acc.add(gtBankTotal);
    }, BN_ZERO);
    return totalUsd;
  }, [competitionInfo, gtBanks, prices]);

  const claimableFees = useMemo(() => {
    let totalUsd = BN_ZERO;
    console.log('isCompetitionRuning', isCompetitionRuning);
    if (!isCompetitionRuning) return totalUsd;
    for (const key in marketsInfo) {
      const marketInfo = marketsInfo[key];
      const {
        claimableFeeLongTokenAmount,
        claimableFeeShortTokenAmount,
        longToken,
        shortToken,
      } = marketInfo;
      const longTokenUSD = convertTokenAmountToUsd(
        claimableFeeLongTokenAmount,
        longToken.decimals,
        longToken.prices.minPrice
      );
      const shortTokenUSD = convertTokenAmountToUsd(
        claimableFeeShortTokenAmount,
        shortToken.decimals,
        shortToken.prices.minPrice
      );
      totalUsd = totalUsd.add(longTokenUSD).add(shortTokenUSD);
    }
    return totalUsd;
  }, [marketsInfo, isCompetitionRuning]);

  useEffect(() => {
    if (!competitionInfo) return;
  }, [competitionInfo]);
  if (!competitionInfo)
    return {
      vol: new BN(0),
    };
  return {
    vol: receiverVaultOut
      .add(claimableFees)
      .mul(new BN((competitionInfo?.treasuryPriceFactor || 0.3) * 1e6))
      .div(new BN(1e6))
      .add(competitionInfo?.basePrize || BN_ZERO),
  };
};

export default useCompetitionVol;
