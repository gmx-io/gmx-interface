import { useEffect, useMemo, useState } from "react";

import { deriveSolanaPosition } from "./deriveSolanaPosition";
import { toSolanaPositionViewModel } from "./solanaPositionAdapter";
import type { SolanaPositionCalculation, SolanaPositionViewModel } from "./types";
import { useSolanaPositionAccounts } from "./useSolanaPositionAccounts";
import { loadGmsolRuntime, type GmsolSdk } from "../lib/gmsolRuntime";
import { useSolanaMarkets } from "../markets/useSolanaMarkets";
import { useSolanaMarketState } from "../markets/useSolanaMarketState";
import { useSolanaTokenPrices } from "../prices/useSolanaTokenPrices";
import { useSolanaWallet } from "../wallet/useSolanaWallet";

export type SolanaPositionsResult = {
  /** Open positions, newest first. */
  positions: SolanaPositionViewModel[];
  isWalletConnected: boolean;
  /** First snapshot (or the SDK runtime) still loading. */
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
};

/**
 * Read-only GMTrade positions of the connected Solana wallet:
 * position accounts (RPC) + market accounts (RPC) + market list and prices (backend socket)
 * → GMTrade SDK calculation → `SolanaPositionViewModel`.
 */
export function useSolanaPositions(): SolanaPositionsResult {
  const { address: owner } = useSolanaWallet();
  const accounts = useSolanaPositionAccounts(owner);
  const { marketInfoByToken } = useSolanaMarkets();
  const { tokenPriceByMint } = useSolanaTokenPrices();

  const marketTokens = useMemo(
    () => [...new Set(accounts.raw.map((position) => position.marketToken))],
    [accounts.raw]
  );
  const marketState = useSolanaMarketState(marketTokens);

  const [sdk, setSdk] = useState<GmsolSdk>();
  const [sdkError, setSdkError] = useState<Error | null>(null);
  useEffect(() => {
    if (!owner || sdk) return;
    let disposed = false;
    loadGmsolRuntime()
      .then((runtime) => {
        if (!disposed) setSdk(runtime.sdk);
      })
      .catch((cause: unknown) => {
        if (!disposed) setSdkError(cause instanceof Error ? cause : new Error(String(cause)));
      });
    return () => {
      disposed = true;
    };
  }, [owner, sdk]);

  const { positions, deriveError } = useMemo(() => {
    if (!owner) return { positions: [], deriveError: null };
    let deriveError: Error | null = null;
    const list = accounts.raw.map((raw) => {
      const marketInfo = marketInfoByToken.get(raw.marketToken);
      const marketAccount = marketState.byMarketToken.get(raw.marketToken);
      const indexToken = marketInfo?.indexToken ?? marketAccount?.indexToken;
      const indexTicker = indexToken ? tokenPriceByMint.get(indexToken) : undefined;
      let calculation: SolanaPositionCalculation = { priceUnavailable: true, unavailableReason: "no-price" };
      if (sdk) {
        try {
          calculation = deriveSolanaPosition(sdk, {
            raw,
            marketInfo,
            marketAccount,
            prices: {
              index: indexTicker,
              long: marketInfo ? tokenPriceByMint.get(marketInfo.longToken) : undefined,
              short: marketInfo ? tokenPriceByMint.get(marketInfo.shortToken) : undefined,
            },
          });
        } catch (cause) {
          // Keep the position visible with its on-chain fields; report the SDK failure once.
          deriveError =
            deriveError ??
            new Error(
              `Failed to calculate position ${raw.pubkey}: ${cause instanceof Error ? cause.message : String(cause)}`
            );
          calculation = { priceUnavailable: true, unavailableReason: "calculation-error" };
        }
      }
      return toSolanaPositionViewModel(
        raw,
        calculation,
        marketInfo,
        indexTicker,
        tokenPriceByMint.get(raw.collateralToken)
      );
    });
    list.sort((a, b) => (a.increasedAt === b.increasedAt ? 0 : a.increasedAt > b.increasedAt ? -1 : 1));
    return { positions: list, deriveError };
  }, [owner, accounts.raw, marketInfoByToken, marketState.byMarketToken, tokenPriceByMint, sdk]);

  return {
    positions,
    isWalletConnected: Boolean(owner),
    isLoading: Boolean(owner) && (accounts.isLoading || (!sdk && !sdkError)),
    error: accounts.error ?? sdkError ?? marketState.error ?? deriveError,
    refresh: accounts.refresh,
  };
}
