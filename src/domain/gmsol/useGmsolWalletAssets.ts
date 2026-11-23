import { useEffect, useMemo, useReducer, useRef } from "react";

import { getIsSolanaNetworkEnabled } from "config/ab";
import { ARBITRUM, isSolanaNetwork, SOLANA_NETWORK_ID } from "config/chains";
import { getSolanaWalletAssets } from "domain/solana/solanaWalletAssets";
import { useChainId } from "lib/chains";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import { FREQUENT_UPDATE_INTERVAL, PRICES_CACHE_TTL } from "lib/timeConstants";
import { API_STALE_MS, useSWRWithFreshness } from "lib/useSWRWithFreshness";

import type { GmsolTokenPricesData } from "./gmsolOracleUtils";
import { fetchGmsolPrices } from "./tokens/fetchGmsolPrices";
import { resolveGmsolTokensData, type GmsolTokensSnapshot } from "./tokens/resolveGmsolTokensData";
import { useGmsolWalletBalances } from "./useGmsolWalletBalances";
import { SOLANA_WALLET_TOKENS } from "./walletTokens";

export function getSolanaWalletPricesKey(url: string) {
  return ["solanaWalletPrices", SOLANA_NETWORK_ID, url] as const;
}

export function useGmsolWalletAssets(owner: string | undefined) {
  const { networkId } = useChainId();
  const enabled = getIsSolanaNetworkEnabled() && isSolanaNetwork(networkId) && Boolean(owner);
  const arbitrumFetcher = useOracleKeeperFetcher(ARBITRUM);

  const balances = useGmsolWalletBalances(owner);
  const pricesKey = enabled ? getSolanaWalletPricesKey(arbitrumFetcher.url) : null;
  const prices = useSWRWithFreshness<GmsolTokenPricesData | undefined>(
    pricesKey,
    () => fetchGmsolPrices(arbitrumFetcher),
    { refreshInterval: FREQUENT_UPDATE_INTERVAL, maxAgeMs: FREQUENT_UPDATE_INTERVAL + API_STALE_MS }
  );

  const snapshotRef = useRef<GmsolTokensSnapshot>();
  const snapshot = pricesKey
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
  const balancesError = balances.error;

  const walletAssets = useMemo(
    () =>
      balancesError
        ? undefined
        : getSolanaWalletAssets({ tokens: SOLANA_WALLET_TOKENS, balances: balances.data, prices: freshPrices }),
    [balancesError, balances.data, freshPrices]
  );

  const isBalancesLoading = !balancesError && balances.data === undefined;

  return {
    assets: walletAssets?.assets,
    totalUsd: walletAssets?.totalUsd,
    isLoading: isBalancesLoading || (!balancesError && !prices.error && prices.freshness.asOf === undefined),
    balancesError,
    pricesError: prices.error,
  };
}
