import { useMemo } from "react";

import { isOrdersListShowKind, sortSolanaOrdersForList } from "./orderRules";
import { toSolanaOrderViewModel } from "./solanaOrderAdapter";
import type { SolanaOrderViewModel } from "./types";
import { useSolanaOrderAccounts } from "./useSolanaOrderAccounts";
import { useSolanaMarkets } from "../markets/useSolanaMarkets";
import { useSolanaTokenPrices } from "../prices/useSolanaTokenPrices";
import { useSolanaWallet } from "../wallet/useSolanaWallet";

export type SolanaOrdersResult = {
  /** Orders the GMTrade Orders tab shows, in GMTrade list order. */
  orders: SolanaOrderViewModel[];
  /** Tab badge value: number of displayable orders. */
  count: number;
  isWalletConnected: boolean;
  /** First snapshot (or the decoder runtime) still loading. */
  isLoading: boolean;
  /** Orders are known but the market feed has not delivered market metadata yet. */
  isMarketDataPending: boolean;
  error: Error | null;
  refresh: () => void;
};

export type SolanaOrdersOptions = {
  /** Enable the 15 s snapshot poll (Orders tab active). */
  pollingEnabled?: boolean;
};

/**
 * Read-only GMTrade orders of the connected Solana wallet:
 * order accounts (RPC) + market list and prices (backend socket) → GMTrade display rules → `SolanaOrderViewModel`.
 */
export function useSolanaOrders({ pollingEnabled = false }: SolanaOrdersOptions = {}): SolanaOrdersResult {
  const { address: owner } = useSolanaWallet();
  const accounts = useSolanaOrderAccounts(owner, { pollingEnabled });
  const { marketInfoByToken, status: marketStatus, error: marketError } = useSolanaMarkets();
  const { tokenPriceByMint } = useSolanaTokenPrices();

  const orders = useMemo(() => {
    if (!owner) return [];
    const visible = sortSolanaOrdersForList(accounts.raw.filter((order) => isOrdersListShowKind(order.kind)));
    return visible.map((raw) =>
      toSolanaOrderViewModel(raw, { marketInfo: marketInfoByToken.get(raw.marketToken), tokenPriceByMint })
    );
  }, [owner, accounts.raw, marketInfoByToken, tokenPriceByMint]);

  const isMarketDataPending = orders.length > 0 && marketStatus !== "ready" && marketStatus !== "error";

  return {
    orders,
    count: orders.length,
    isWalletConnected: Boolean(owner),
    isLoading: Boolean(owner) && accounts.isLoading,
    isMarketDataPending,
    error: accounts.error ?? (marketError ? new Error(marketError) : null),
    refresh: accounts.refresh,
  };
}
