import { useEffect, useMemo, useRef, useState } from 'react';
import { translateAddress } from '@coral-xyz/anchor';

import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useStoreProgram } from '@/contexts/anchor';
import { getMarinClient } from '@/lib/marin/client';
import { MARIN_MARKETS_SUBSCRIPTION } from '@/lib/marin/queries';
import {
  MarketsSubscriptionPayload,
  MarketSubscriptionRecord,
} from '@/lib/marin/types';
import { Market, MarketState } from '@/selectors/market/types';
import {
  decodeMarketAccount,
  DecodedMarketAccount,
} from '@/utils/market/decodeMarketAccount';
import { useAppStore } from '@/zustand/useAppStore';

export interface UseMarinMarketsOptions {
  // Accepted for parity with the legacy hook signature; subscriptions are
  // already push-driven so this flag is not consulted.
  enableRefresh?: boolean;
}

export interface UseMarinMarketsResult {
  markets: Record<string, DecodedMarketAccount>;
  isLoading: boolean;
}

// Subscription-driven replacement for the legacy RPC-polling useMarkets.
// Streams market account changes from marin over `graphql-ws`, decodes each
// record with the anchor codec, and pushes the merged map into the global
// app store via the existing setAllMarketsAndStates contract.
//
// State updates are coalesced once per animation frame to avoid storming
// React renders during the initial snapshot replay.
export const useMarinMarkets = (
  // Accepted for parity with the legacy hook signature; subscriptions are
  // already push-driven so this flag is not consulted.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options: UseMarinMarketsOptions = {}
): UseMarinMarketsResult => {
  const storeProgram = useStoreProgram();
  const setAllMarketsAndStates = useAppStore(
    (state) => state.markets.setAllMarketsAndStates
  );
  const setMarketBase64Map = useAppStore(
    (state) => state.markets.setMarketBase64Map
  );

  const cacheRef = useRef<Map<string, DecodedMarketAccount>>(new Map());
  // Mirror cache keyed by marketToken -> base64. Phase 1b consumers (notably
  // useMarinPositions) read this to decode position-relative market state
  // without re-fetching the same account over RPC.
  const base64CacheRef = useRef<Map<string, string>>(new Map());
  const flushScheduledRef = useRef(false);

  const [snapshot, setSnapshot] = useState<
    Record<string, DecodedMarketAccount>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  const storeAddress = useMemo(
    () => GMX_SOLANA_STORE_ADDRESS.toBase58(),
    []
  );

  useEffect(() => {
    const client = getMarinClient();
    let disposed = false;
    let inSnapshot = false;

    // Marin only emits `isLastSnapshot` on an actual record. Defensive
    // fallback: if the snapshot stream is empty (no markets configured), the
    // loading gate would otherwise stay set forever. Markets normally arrive
    // within ~1.5s, so 8s is a safe ceiling for "snapshot is empty".
    const SNAPSHOT_DEADLINE_MS = 8000;
    const deadlineTimer = setTimeout(() => {
      if (disposed) return;
      setIsLoading(false);
    }, SNAPSHOT_DEADLINE_MS);

    const flush = () => {
      flushScheduledRef.current = false;
      if (disposed) return;
      const next = Object.fromEntries(cacheRef.current.entries());
      setSnapshot(next);
      setAllMarketsAndStates(next);
      // Replace the marketBase64Map in the store so consumers can rely on
      // reference identity for change detection.
      setMarketBase64Map(new Map(base64CacheRef.current));
    };

    const scheduleFlush = () => {
      if (flushScheduledRef.current) return;
      flushScheduledRef.current = true;
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(flush);
      } else {
        setTimeout(flush, 16);
      }
    };

    const handleRecord = (record: MarketSubscriptionRecord) => {
      if (!record) return;
      if (record.isSnapshot && !inSnapshot) {
        inSnapshot = true;
      }
      const isDeletion = !record.data;
      if (isDeletion) {
        const key = translateAddress(record.marketToken).toBase58();
        cacheRef.current.delete(key);
        base64CacheRef.current.delete(key);
      }

      if (!isDeletion) {
        let buffer: Buffer;
        try {
          buffer = Buffer.from(record.data, 'base64');
        } catch (err) {
          console.error('[marin] failed to decode market base64 payload', err);
          return;
        }
        const decoded = decodeMarketAccount(buffer, record.pubkey, storeProgram);
        if (!decoded) return;
        const key = decoded.meta.marketTokenAddress.toBase58();
        cacheRef.current.set(key, decoded);
        base64CacheRef.current.set(key, record.data);
      }

      if (record.isLastSnapshot) {
        inSnapshot = false;
        setIsLoading(false);
        // Flush once at the end of the snapshot replay so downstream hooks do
        // not re-run their full RPC queries for every fragment.
        flush();
        return;
      }

      if (!record.hasLastSnapshot) {
        // Endpoint replied without snapshot support; treat the first delivered
        // record as enough to proceed past the loading gate.
        setIsLoading(false);
        scheduleFlush();
        return;
      }

      if (!inSnapshot) {
        scheduleFlush();
      }
    };

    const unsubscribe = client.subscribe<MarketsSubscriptionPayload>(
      {
        query: MARIN_MARKETS_SUBSCRIPTION,
        variables: {
          store: storeAddress,
          withSnapshot: true,
        },
      },
      {
        next: ({ data }) => {
          const record = data?.markets;
          if (!record) return;
          handleRecord(record);
        },
        error: (err) => {
          console.error('[marin] markets subscription error', err);
        },
        complete: () => {
          // graphql-ws auto-retries on close; nothing to do here.
        },
      }
    );

    return () => {
      disposed = true;
      clearTimeout(deadlineTimer);
      unsubscribe();
    };
  }, [storeAddress, storeProgram, setAllMarketsAndStates, setMarketBase64Map]);

  return { markets: snapshot, isLoading };
};

// Re-export decoded value type so call sites can mirror legacy typing.
export type { DecodedMarketAccount, Market, MarketState };
