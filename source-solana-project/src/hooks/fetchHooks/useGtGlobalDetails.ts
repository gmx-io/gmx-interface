/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useStoreAccount } from '@/hooks/fetchHooks/useStoreAccount';
import { GtGlobalDetails } from '@/selectors/gt/types';
import { BN } from '@coral-xyz/anchor';
import { useMemo } from 'react';

export function useGtGlobalDetails() {
  const { store, isLoading } = useStoreAccount(GMX_SOLANA_STORE_ADDRESS);

  const gtGlobalDetails = useMemo(() => {
    if (!store) return null;

    const gt = store.gt;
    const referralDiscountFactor = store.factor.orderFeeDiscountForReferredUser;

    return {
      decimals: gt.decimals,
      lastMintedAt: gt.lastMintedAt,
      growStepAmount: gt.growStepAmount,
      growSteps: gt.growSteps,
      supply: gt.supply,
      totalMintedAmount: gt.totalMinted,
      mintingCostGrowFactor: gt.mintingCostGrowFactor,
      mintingCost: gt.mintingCost,
      maxRank: gt.maxRank,
      ranks: gt.ranks.map((rank: BN) => rank),
      orderFeeDiscountFactors: gt.orderFeeDiscountFactors.map(
        (factor: BN) => factor
      ),
      referralRewardFactors: gt.referralRewardFactors.map(
        (factor: BN) => factor
      ),
      reserveFactor: gt.reserveFactor,
      exchangeTimeWindow: gt.exchangeTimeWindow,
      referralDiscountFactor: referralDiscountFactor,
      gtVaultAmount: gt.gtVault,
    } as GtGlobalDetails;
  }, [store]);

  return {
    gtGlobalDetails,
    isLoading,
  };
}
