import { useMemo } from 'react';
import useSWR from 'swr';
import type { KeyedMutator } from 'swr';
import { useWallet } from '@solana/wallet-adapter-react';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useAppStore } from '@/zustand/useAppStore';
import { selectGtGlobalDetailsDecimals } from '@/selectors/gt/gtGlobalDetailsSelectors';
import { fetchGtBuybackSummary } from '../api/keeperBuyback';
import {
  GT_BUYBACK_SUMMARY_GUEST_OWNER,
  GT_BUYBACK_SUMMARY_KEY,
} from '../buybackConstants';
import type {
  GtBuybackSummary,
  MyBuybackParticipationView,
  TodaysBuybackPoolView,
} from '../types';
import {
  deriveMyBuybackParticipation,
  deriveTodaysBuybackPool,
} from '../utils/buybackDerivations';

export type UseGtBuybackSummaryResult = {
  summary: GtBuybackSummary | undefined;
  pool: TodaysBuybackPoolView | undefined;
  participation: MyBuybackParticipationView | undefined;
  isLoading: boolean;
  mutate: KeyedMutator<GtBuybackSummary>;
  error: Error | undefined;
};

export function useGtBuybackSummary(enabled = true): UseGtBuybackSummaryResult {
  const { publicKey } = useWallet();
  const owner = publicKey?.toBase58() ?? GT_BUYBACK_SUMMARY_GUEST_OWNER;
  const store = GMX_SOLANA_STORE_ADDRESS.toBase58();
  const gtDecimals = useAppStore(selectGtGlobalDetailsDecimals) || 7;
  const key = enabled ? `${GT_BUYBACK_SUMMARY_KEY}:${store}:${owner}` : null;

  const swr = useSWR<GtBuybackSummary, Error>(
    key,
    async (): Promise<GtBuybackSummary> => {
      return fetchGtBuybackSummary({
        store,
        owner,
        requestedGtAmount: null,
      });
    },
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
      refreshInterval: 15_000,
    }
  );

  const pool: TodaysBuybackPoolView | undefined = useMemo(() => {
    if (!swr.data) return undefined;
    return deriveTodaysBuybackPool(swr.data, gtDecimals);
  }, [swr.data, gtDecimals]);

  const participation: MyBuybackParticipationView | undefined = useMemo(() => {
    if (!swr.data) return undefined;
    return deriveMyBuybackParticipation(
      swr.data.myBuybackParticipation,
      gtDecimals
    );
  }, [swr.data, gtDecimals]);

  return {
    summary: swr.data,
    pool,
    participation,
    isLoading: swr.isLoading,
    mutate: swr.mutate,
    error: swr.error,
  };
}
