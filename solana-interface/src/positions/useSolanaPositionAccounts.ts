import { PublicKey, type MemcmpFilter } from "@solana/web3.js";
import { useCallback, useEffect, useRef, useState } from "react";

import { decodeSolanaPosition } from "./decodeSolanaPosition";
import { applyAccountUpdate, reconcileSnapshot, selectOpenPositions } from "./positionAccountsCache";
import {
  POSITION_DISCRIMINATOR,
  POSITION_OWNER_OFFSET,
  POSITION_REFRESH_MIN_INTERVAL_MS,
  POSITION_STORE_OFFSET,
} from "./solanaPositionConstants";
import type { RawSolanaPosition } from "./types";
import { GMX_SOLANA_STORE_ADDRESS, GMX_SOLANA_STORE_PROGRAM_ID } from "../config/solanaProgram";
import { loadGmsolRuntime } from "../lib/gmsolRuntime";
import { getSolanaRpcClient } from "../lib/rpc";

export type SolanaPositionAccountsResult = {
  /** Open positions (sizeInUsd > 0) of the owner, unordered. */
  raw: RawSolanaPosition[];
  /** True until the first snapshot for the current owner has resolved (successfully or not). */
  isLoading: boolean;
  error: Error | null;
  /** Re-fetches the snapshot (throttled). The subscription is kept. */
  refresh: () => void;
};

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}

/**
 * Source: gmx-solana-interface/app/src/hooks/fetchHooks/useOnChainPositions.ts.
 * `getProgramAccounts` snapshot + `onProgramAccountChange` subscription filtered by discriminator,
 * store and owner. Slot protection drops stale updates; every snapshot reconciles the cache.
 * Changing `owner` tears everything down first, so no positions of a previous wallet survive.
 */
export function useSolanaPositionAccounts(owner: string | undefined): SolanaPositionAccountsResult {
  const [raw, setRaw] = useState<RawSolanaPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadSnapshotRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    setRaw([]);
    setError(null);
    loadSnapshotRef.current = () => undefined;
    if (!owner) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    let disposed = false;
    let subscriptionId: number | undefined;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let lastSnapshotAt = 0;
    const cache = new Map<string, RawSolanaPosition>();
    const connection = getSolanaRpcClient();
    const programId = new PublicKey(GMX_SOLANA_STORE_PROGRAM_ID);
    const filters: MemcmpFilter[] = [
      { memcmp: { offset: 0, bytes: POSITION_DISCRIMINATOR } },
      { memcmp: { offset: POSITION_STORE_OFFSET, bytes: GMX_SOLANA_STORE_ADDRESS } },
      { memcmp: { offset: POSITION_OWNER_OFFSET, bytes: owner } },
    ];

    const publish = () => {
      if (!disposed) setRaw(selectOpenPositions(cache));
    };

    void loadGmsolRuntime()
      .then(async ({ coder }) => {
        if (disposed) return;

        const applyAccount = (pubkey: string, data: Buffer, slot: number) =>
          applyAccountUpdate(cache, pubkey, slot, decodeSolanaPosition(coder, pubkey, data, slot));

        const loadSnapshot = async () => {
          lastSnapshotAt = Date.now();
          try {
            const response = await connection.getProgramAccounts(programId, {
              filters,
              commitment: "confirmed",
              withContext: true,
            });
            if (disposed) return;
            const snapshotSlot = response.context.slot;
            const seen = new Set<string>();
            for (const entry of response.value) {
              const pubkey = entry.pubkey.toBase58();
              seen.add(pubkey);
              applyAccount(pubkey, entry.account.data, snapshotSlot);
            }
            reconcileSnapshot(cache, seen, snapshotSlot);
            setError(null);
            publish();
          } catch (cause) {
            if (!disposed) setError(toError(cause));
          } finally {
            if (!disposed) setIsLoading(false);
          }
        };

        loadSnapshotRef.current = () => {
          if (disposed) return;
          const elapsed = Date.now() - lastSnapshotAt;
          if (elapsed >= POSITION_REFRESH_MIN_INTERVAL_MS) {
            void loadSnapshot();
            return;
          }
          if (refreshTimer !== undefined) return;
          refreshTimer = setTimeout(() => {
            refreshTimer = undefined;
            void loadSnapshot();
          }, POSITION_REFRESH_MIN_INTERVAL_MS - elapsed);
        };

        // Subscribe before the snapshot so no update between the two is lost. Closing a position
        // never emits (the account is gone), but the preceding decrease to sizeInUsd = 0 does.
        subscriptionId = connection.onProgramAccountChange(
          programId,
          (info, context) => {
            if (disposed) return;
            try {
              if (applyAccount(info.accountId.toBase58(), info.accountInfo.data, context.slot)) publish();
            } catch (cause) {
              setError(toError(cause));
            }
          },
          { commitment: "confirmed", filters }
        );

        await loadSnapshot();
      })
      .catch((cause: unknown) => {
        if (disposed) return;
        setError(toError(cause));
        setIsLoading(false);
      });

    return () => {
      disposed = true;
      loadSnapshotRef.current = () => undefined;
      if (refreshTimer !== undefined) clearTimeout(refreshTimer);
      if (subscriptionId !== undefined) {
        void connection.removeProgramAccountChangeListener(subscriptionId).catch(() => undefined);
      }
    };
  }, [owner]);

  const refresh = useCallback(() => loadSnapshotRef.current(), []);

  return { raw, isLoading, error, refresh };
}
