/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { translateAddress } from '@coral-xyz/anchor';
import { useEffect, useMemo, useRef, useState } from 'react';

import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { getMarinClient } from '@/lib/marin/client';
import { TokenBalances } from '@/selectors/token/types';
import { toBN } from 'gmsol';

type GlvMarketTokens = {
  glvAddress: string | { toString(): string };
  marketTokens: unknown[];
};

interface GlvMarketRecord {
  marketToken: string;
  balance: string;
}

interface GlvSubscriptionRecord {
  pubkey: string;
  markets: GlvMarketRecord[];
  isSnapshot: boolean;
  isLastSnapshot: boolean | null;
  hasLastSnapshotFlag: boolean;
}

const MARIN_GLVS_SUBSCRIPTION = /* GraphQL */ `
  subscription MarinGlvs($store: StringPubkey, $withSnapshot: Boolean) {
    glvs(store: $store, withSnapshot: $withSnapshot) {
      pubkey
      markets {
        marketToken
        balance
      }
      isSnapshot
      isLastSnapshot
      hasLastSnapshotFlag
    }
  }
`;

// Subscription-driven replacement for the 60s-polling
// useGlvMarketTokenBalances. Each marin push delivers the full per-market
// balance vector for a single GLV vault, so we cache by GLV pubkey and
// flatten into the legacy `Record<glvAddress, Record<marketTokenMint, BN>>`
// return shape.
//
// Like useMarinPositions, an 8s deadline guards against the empty-snapshot
// edge case where marin emits no record (and therefore no isLastSnapshot)
// for a store with zero GLVs.
export const useMarinGlvMarketTokenBalances = (
  // The argument list is preserved for parity with the legacy signature even
  // though marin returns the full GLV registry; downstream consumers index
  // into the result map by their own keys.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _glvsWithMarkets: GlvMarketTokens[]
): Record<string, TokenBalances> => {
  const cacheRef = useRef<Map<string, TokenBalances>>(new Map());
  const flushScheduledRef = useRef(false);
  const [snapshot, setSnapshot] = useState<Record<string, TokenBalances>>({});

  const storeAddress = useMemo(
    () => GMX_SOLANA_STORE_ADDRESS.toBase58(),
    []
  );

  useEffect(() => {
    const client = getMarinClient();
    let disposed = false;

    // Empty-snapshot guard: see Phase 1b's deadline rationale.
    const SNAPSHOT_DEADLINE_MS = 8000;
    const deadlineTimer = setTimeout(() => {
      if (disposed) return;
      // Force a flush so consumers see an empty map rather than `undefined`.
      flush();
    }, SNAPSHOT_DEADLINE_MS);

    const flush = () => {
      flushScheduledRef.current = false;
      if (disposed) return;
      setSnapshot(Object.fromEntries(cacheRef.current.entries()));
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

    const handleRecord = (record: GlvSubscriptionRecord) => {
      const balances: TokenBalances = {};
      for (const m of record.markets ?? []) {
        try {
          const mint = translateAddress(m.marketToken).toBase58();
          balances[mint] = toBN(BigInt(m.balance));
        } catch (err) {
          console.error('[marin] failed to ingest glv market entry', m, err);
        }
      }
      cacheRef.current.set(record.pubkey, balances);
      scheduleFlush();
    };

    const unsubscribe = client.subscribe<{ glvs: GlvSubscriptionRecord }>(
      {
        query: MARIN_GLVS_SUBSCRIPTION,
        variables: { store: storeAddress, withSnapshot: true },
      },
      {
        next: ({ data }) => {
          if (disposed) return;
          const record = data?.glvs;
          if (!record) return;
          handleRecord(record);
          if (record.isLastSnapshot) scheduleFlush();
        },
        error: (err) => {
          console.error('[marin] glvs subscription error', err);
        },
        complete: () => {
          // graphql-ws auto-retries; resubscription replays the snapshot.
        },
      }
    );

    return () => {
      disposed = true;
      clearTimeout(deadlineTimer);
      unsubscribe();
    };
  }, [storeAddress]);

  return snapshot;
};
