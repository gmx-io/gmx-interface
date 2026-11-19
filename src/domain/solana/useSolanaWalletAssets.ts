import { useEffect, useMemo, useReducer, useRef } from "react";
import useSWRImmutable from "swr/immutable";

import { getIsSolanaNetworkEnabled } from "config/ab";
import { ARBITRUM, isSolanaNetwork, SOLANA_NETWORK_ID } from "config/chains";
import type { GmsolTokenPricesData } from "domain/gmsol/gmsolOracleUtils";
import type { GmsolTokensSnapshot } from "domain/gmsol/tokens/resolveGmsolTokensData";
import { useChainId } from "lib/chains";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import { FREQUENT_UPDATE_INTERVAL, PRICES_CACHE_TTL } from "lib/timeConstants";
import { API_STALE_MS, retryAtRefreshCadence, useSWRWithFreshness } from "lib/useSWRWithFreshness";

import { getSolanaWalletAssets } from "./solanaWalletAssets";
import { useSolanaBalances } from "./useSolanaBalances";

type SolanaWalletTokensModule = typeof import("domain/gmsol/walletTokens");

export function getSolanaWalletPricesKey(url: string) {
  return ["solanaWalletPrices", SOLANA_NETWORK_ID, url] as const;
}

/**
 * The connected Solana wallet's assets with USD values. Loading and errors stay distinct from an empty wallet:
 * `assets` is undefined until the balances load and on a balance error. The token list and the price read stay in
 * lazy chunks; prices come from the Arbitrum keeper by mint, and every key is null unless Solana is selected.
 */
export function useSolanaWalletAssets(owner: string | undefined) {
  const { networkId } = useChainId();
  const enabled = getIsSolanaNetworkEnabled() && isSolanaNetwork(networkId) && Boolean(owner);
  const arbitrumFetcher = useOracleKeeperFetcher(ARBITRUM);

  const balances = useSolanaBalances(owner);
  const walletTokens = useSWRImmutable<SolanaWalletTokensModule, Error>(
    enabled ? ["solanaWalletTokens", SOLANA_NETWORK_ID] : null,
    () => import("domain/gmsol/walletTokens"),
    { onErrorRetry: retryAtRefreshCadence }
  );
  const pricesKey = enabled ? getSolanaWalletPricesKey(arbitrumFetcher.url) : null;
  const prices = useSWRWithFreshness<GmsolTokenPricesData | undefined>(
    pricesKey,
    async () => (await import("domain/gmsol/walletTokens")).fetchGmsolPrices(arbitrumFetcher),
    { refreshInterval: FREQUENT_UPDATE_INTERVAL, maxAgeMs: FREQUENT_UPDATE_INTERVAL + API_STALE_MS }
  );

  const resolveGmsolTokensData = walletTokens.data?.resolveGmsolTokensData;
  const snapshotRef = useRef<GmsolTokensSnapshot>();
  const snapshot =
    pricesKey && resolveGmsolTokensData
      ? resolveGmsolTokensData({
          previous: snapshotRef.current,
          scope: pricesKey.join(" "),
          response: prices.data,
          now: Date.now(),
        })
      : undefined;
  snapshotRef.current = snapshot;

  const pricesUpdatedAt = snapshot?.pricesUpdatedAt;
  const [pricesExpiryCheck, checkPricesExpiry] = useReducer((tick: number) => tick + 1, 0);

  useEffect(() => {
    if (pricesUpdatedAt === undefined) return;

    const timeout = setTimeout(checkPricesExpiry, Math.max(0, pricesUpdatedAt + PRICES_CACHE_TTL - Date.now()));
    return () => clearTimeout(timeout);
  }, [pricesUpdatedAt, pricesExpiryCheck]);

  const freshPrices = prices.freshness.isStale ? undefined : snapshot?.prices;
  const balancesError = balances.error ?? walletTokens.error;

  const walletAssets = useMemo(
    () =>
      balancesError
        ? undefined
        : getSolanaWalletAssets(walletTokens.data?.SOLANA_WALLET_TOKENS, balances.data, freshPrices),
    [balancesError, walletTokens.data, balances.data, freshPrices]
  );

  const isBalancesLoading = !balancesError && (balances.data === undefined || walletTokens.data === undefined);

  return {
    assets: walletAssets?.assets,
    totalUsd: walletAssets?.totalUsd,
    // a balance error ends loading even while prices are pending
    isLoading: isBalancesLoading || (!balancesError && !prices.error && prices.freshness.asOf === undefined),
    balancesError,
    pricesError: prices.error,
  };
}
