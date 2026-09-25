import { PublicKey, type MemcmpFilter } from "@solana/web3.js";
import { useCallback, useEffect, useRef, useState } from "react";

import { decodeSolanaOrder } from "./decodeSolanaOrder";
import { applyOrderAccountUpdate, reconcileOrderSnapshot } from "./orderAccountsCache";
import {
  ORDER_DISCRIMINATOR,
  ORDER_OWNER_OFFSET,
  ORDER_POLL_INTERVAL_MS,
  ORDER_REFRESH_MIN_INTERVAL_MS,
  ORDER_STORE_OFFSET,
} from "./solanaOrderConstants";
import type { RawSolanaOrder } from "./types";
import { GMX_SOLANA_STORE_ADDRESS, GMX_SOLANA_STORE_PROGRAM_ID } from "../config/solanaProgram";
import { loadGmsolRuntime } from "../lib/gmsolRuntime";
import { getSolanaRpcClient } from "../lib/rpc";

export type SolanaOrderAccountsResult = {
  /** Every decoded order account of the owner (any kind / action state), unordered. */
  raw: RawSolanaOrder[];
  /** True until the first snapshot for the current owner has resolved (successfully or not). */
  isLoading: boolean;
  error: Error | null;
  /** Re-fetches the snapshot (throttled). The subscription is kept. */
  refresh: () => void;
};

export type SolanaOrderAccountsOptions = {
  /** Poll the snapshot every `ORDER_POLL_INTERVAL_MS` (GMTrade: only while the Orders tab is active). */
  pollingEnabled?: boolean;
};

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}

/**
 * Source: gmx-solana-interface/app/src/hooks/fetchHooks/useOrders.ts + orderHooks/useOrdersData.ts.
 * `getProgramAccounts` snapshot + `onProgramAccountChange` subscription filtered by discriminator, store and
 * owner, plus a 15 s poll while `pollingEnabled`. Every snapshot is authoritative: accounts missing from it
 * (executed / cancelled orders close their account) are removed. Changing `owner` tears everything down first.
 */
export function useSolanaOrderAccounts(
  owner: string | undefined,
  { pollingEnabled = false }: SolanaOrderAccountsOptions = {}
): SolanaOrderAccountsResult {
  const [raw, setRaw] = useState<RawSolanaOrder[]>([]);
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
    const cache = new Map<string, RawSolanaOrder>();
    const connection = getSolanaRpcClient();
    const programId = new PublicKey(GMX_SOLANA_STORE_PROGRAM_ID);
    const filters: MemcmpFilter[] = [
      { memcmp: { offset: 0, bytes: ORDER_DISCRIMINATOR } },
      { memcmp: { offset: ORDER_STORE_OFFSET, bytes: GMX_SOLANA_STORE_ADDRESS } },
      { memcmp: { offset: ORDER_OWNER_OFFSET, bytes: owner } },
    ];

    const publish = () => {
      if (!disposed) setRaw([...cache.values()]);
    };

    void loadGmsolRuntime()
      .then(async ({ coder }) => {
        if (disposed) return;

        const applyAccount = (pubkey: string, data: Buffer, slot: number) =>
          applyOrderAccountUpdate(cache, pubkey, slot, decodeSolanaOrder(coder, pubkey, data, slot));

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
            let decodeError: Error | null = null;
            for (const entry of response.value) {
              const pubkey = entry.pubkey.toBase58();
              seen.add(pubkey);
              try {
                applyAccount(pubkey, entry.account.data, snapshotSlot);
              } catch (cause) {
                // Keep the other orders; surface that the list may be incomplete.
                decodeError = decodeError ?? new Error(`Failed to decode order ${pubkey}: ${toError(cause).message}`);
              }
            }
            reconcileOrderSnapshot(cache, seen, snapshotSlot);
            setError(decodeError);
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
          if (elapsed >= ORDER_REFRESH_MIN_INTERVAL_MS) {
            void loadSnapshot();
            return;
          }
          if (refreshTimer !== undefined) return;
          refreshTimer = setTimeout(() => {
            refreshTimer = undefined;
            void loadSnapshot();
          }, ORDER_REFRESH_MIN_INTERVAL_MS - elapsed);
        };

        // Subscribe before the snapshot so no update between the two is lost. A closed account never
        // emits, so removals rely on the periodic / triggered snapshots.
        subscriptionId = connection.onProgramAccountChange(
          programId,
          (info, context) => {
            if (disposed) return;
            try {
              if (applyAccount(info.accountId.toBase58(), info.accountInfo.data, context.slot)) publish();
            } catch (cause) {
              setError(toError(cause));
            }
            // Executions / cancellations that close other accounts are only visible through a snapshot.
            loadSnapshotRef.current();
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

  // 15 s poll while the Orders tab is active, plus a refresh when the page becomes visible or the network
  // comes back. Both go through the throttled `refresh`, so they never overlap the initial snapshot.
  useEffect(() => {
    if (!owner || !pollingEnabled) return;
    refresh();
    const interval = setInterval(refresh, ORDER_POLL_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", refresh);
    };
  }, [owner, pollingEnabled, refresh]);

  return { raw, isLoading, error, refresh };
}
