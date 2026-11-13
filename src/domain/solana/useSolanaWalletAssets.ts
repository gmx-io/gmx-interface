import { useMemo } from "react";
import useSWR from "swr";
import useSWRImmutable from "swr/immutable";

import { getIsSolanaNetworkEnabled } from "config/ab";
import { ARBITRUM, isSolanaNetwork, SOLANA_NETWORK_ID } from "config/chains";
import type { SolanaWalletToken } from "domain/gmsol/walletTokens";
import { useChainId } from "lib/chains";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import type { TokenPricesData } from "sdk/utils/tokens/types";

import { getSolanaWalletAssets } from "./solanaWalletAssets";
import { useSolanaBalances } from "./useSolanaBalances";

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
  const tokens = useSWRImmutable<readonly SolanaWalletToken[], Error>(
    enabled ? ["solanaWalletTokens", SOLANA_NETWORK_ID] : null,
    async () => (await import("domain/gmsol/walletTokens")).SOLANA_WALLET_TOKENS
  );
  const prices = useSWR<TokenPricesData, Error>(
    enabled ? getSolanaWalletPricesKey(arbitrumFetcher.url) : null,
    async () => (await import("domain/gmsol/walletTokens")).fetchSolanaWalletPrices(arbitrumFetcher)
  );

  const balancesError = balances.error ?? tokens.error;

  const walletAssets = useMemo(
    () =>
      balancesError
        ? undefined
        : getSolanaWalletAssets(tokens.data, balances.data, prices.error ? undefined : prices.data),
    [balancesError, tokens.data, balances.data, prices.data, prices.error]
  );

  const isBalancesLoading = !balancesError && (balances.data === undefined || tokens.data === undefined);

  return {
    assets: walletAssets?.assets,
    totalUsd: walletAssets?.totalUsd,
    // a balance error ends loading even while prices are pending
    isLoading: isBalancesLoading || (!balancesError && !prices.error && prices.data === undefined),
    balancesError,
    pricesError: prices.error,
  };
}
