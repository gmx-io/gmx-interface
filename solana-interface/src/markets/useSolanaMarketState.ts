import { useEffect, useMemo, useState } from "react";

import { decodeSolanaMarket, findSolanaMarketPda, type SolanaMarketAccount } from "./decodeSolanaMarket";
import { loadGmsolRuntime } from "../lib/gmsolRuntime";
import { getSolanaRpcClient } from "../lib/rpc";

const SNAPSHOT_CHUNK_SIZE = 50;

export type SolanaMarketStateResult = {
  /** Keyed by market token mint. */
  byMarketToken: ReadonlyMap<string, SolanaMarketAccount>;
  error: Error | null;
};

/**
 * On-chain `market` accounts for the given market tokens: one snapshot plus an `onAccountChange`
 * subscription per market, with per-account slot protection. Only markets that the current
 * positions reference should be passed in.
 */
export function useSolanaMarketState(marketTokens: readonly string[]): SolanaMarketStateResult {
  const marketTokensKey = useMemo(() => [...marketTokens].sort().join("|"), [marketTokens]);
  const [byMarketToken, setByMarketToken] = useState<ReadonlyMap<string, SolanaMarketAccount>>(new Map());
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const tokens = marketTokensKey ? marketTokensKey.split("|") : [];
    setError(null);
    if (tokens.length === 0) {
      setByMarketToken(new Map());
      return;
    }

    let disposed = false;
    const connection = getSolanaRpcClient();
    const accounts = new Map<string, SolanaMarketAccount>();
    const subscriptionIds: number[] = [];
    const addresses = tokens.map((token) => ({ token, pda: findSolanaMarketPda(token) }));

    const publish = () => {
      if (disposed) return;
      setByMarketToken(new Map(accounts));
    };

    void loadGmsolRuntime()
      .then(async ({ coder }) => {
        if (disposed) return;

        const applyAccount = (token: string, address: string, data: Buffer, slot: number) => {
          const existing = accounts.get(token);
          if (existing && existing.slot > slot) return false;
          accounts.set(token, decodeSolanaMarket(coder, address, data, slot));
          return true;
        };

        for (const { token, pda } of addresses) {
          const id = connection.onAccountChange(
            pda,
            (info, context) => {
              if (disposed) return;
              try {
                if (applyAccount(token, pda.toBase58(), info.data, context.slot)) publish();
              } catch (cause) {
                setError(cause instanceof Error ? cause : new Error(String(cause)));
              }
            },
            "confirmed"
          );
          subscriptionIds.push(id);
        }

        for (let i = 0; i < addresses.length; i += SNAPSHOT_CHUNK_SIZE) {
          const chunk = addresses.slice(i, i + SNAPSHOT_CHUNK_SIZE);
          const response = await connection.getMultipleAccountsInfoAndContext(
            chunk.map(({ pda }) => pda),
            { commitment: "confirmed" }
          );
          if (disposed) return;
          response.value.forEach((info, index) => {
            if (!info) return;
            const { token, pda } = chunk[index];
            applyAccount(token, pda.toBase58(), info.data, response.context.slot);
          });
        }
        publish();
      })
      .catch((cause: unknown) => {
        if (!disposed) setError(cause instanceof Error ? cause : new Error(String(cause)));
      });

    return () => {
      disposed = true;
      for (const id of subscriptionIds) {
        void connection.removeAccountChangeListener(id).catch(() => undefined);
      }
    };
  }, [marketTokensKey]);

  return { byMarketToken, error };
}
