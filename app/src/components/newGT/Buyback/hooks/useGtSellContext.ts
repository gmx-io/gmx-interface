import { useMemo } from 'react';
import useSWR from 'swr';
import { useWallet } from '@solana/wallet-adapter-react';
import { findUserPDA } from 'gmsol';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { GT_BUYBACK_SEASON_ID } from '../buybackConstants';
import {
  fetchGtBuybackSellContext,
  type GtBuybackSellContext,
} from '../api/gtBuybackSqd';

const NETWORK = 'solana-mainnet';
const SELL_REQUEST_WATERMARK_ID = `${NETWORK}-global`;

export type UseGtSellContextResult = {
  context: GtBuybackSellContext | undefined;
  owner: string | undefined;
  referrerUser: string | undefined;
  isLoading: boolean;
  error: Error | undefined;
};

export function useGtSellContext(
  enabled = true
): UseGtSellContextResult {
  const { publicKey } = useWallet();
  const store = GMX_SOLANA_STORE_ADDRESS.toBase58();
  const owner = publicKey?.toBase58();
  const referrerUser = useMemo(
    () =>
      publicKey
        ? findUserPDA(GMX_SOLANA_STORE_ADDRESS, publicKey)[0].toBase58()
        : undefined,
    [publicKey]
  );
  const key = enabled && owner && referrerUser
    ? ['gt/buyback/sell-context', store, owner, referrerUser]
    : null;

  const swr = useSWR<GtBuybackSellContext, Error>(
    key,
    async () => {
      if (!owner || !referrerUser) {
        throw new Error('Wallet is not connected');
      }

      const initial = await fetchGtBuybackSellContext({
        quotaWatermarkId: `${NETWORK}-global-${GT_BUYBACK_SEASON_ID}`,
        sellRequestWatermarkId: SELL_REQUEST_WATERMARK_ID,
        network: NETWORK,
        store,
        seasonId: GT_BUYBACK_SEASON_ID,
        owner,
        referrerUser,
        referenceSlot: 0,
      });
      const referenceSlot = Math.min(
        initial.quotaWatermark?.completedWatermarkSlot ?? 0,
        initial.quotaWatermark?.authorityCompletedThroughSlot ?? 0,
        initial.sellRequestWatermark?.finalizedProcessedThroughSlot ?? 0,
        initial.sellRequestWatermark?.attributionCompletedThroughSlot ?? 0
      );
      if (referenceSlot <= 0) {
        return initial;
      }

      return fetchGtBuybackSellContext({
        quotaWatermarkId: `${NETWORK}-global-${GT_BUYBACK_SEASON_ID}`,
        sellRequestWatermarkId: SELL_REQUEST_WATERMARK_ID,
        network: NETWORK,
        store,
        seasonId: GT_BUYBACK_SEASON_ID,
        owner,
        referrerUser,
        referenceSlot,
      });
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 15_000,
      keepPreviousData: true,
    }
  );

  return {
    context: swr.data,
    owner,
    referrerUser,
    isLoading: swr.isLoading,
    error: swr.error,
  };
}
