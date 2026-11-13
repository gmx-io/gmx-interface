import type { SolanaWalletToken } from "domain/gmsol/walletTokens";
import type { SolanaBalances } from "lib/solana/balances";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";
import type { TokenPricesData } from "sdk/utils/tokens/types";

export type SolanaWalletAsset = SolanaWalletToken & {
  balance: bigint;
  // undefined when the keeper has no price for the token: shown without a USD value, never as $0
  balanceUsd: bigint | undefined;
};

export type SolanaWalletAssets = {
  // the tokens with a balance above zero
  assets: SolanaWalletAsset[];
  // undefined without prices or when a held token has no price
  totalUsd: bigint | undefined;
};

export function getSolanaWalletAssets(
  tokens: readonly SolanaWalletToken[] | undefined,
  balances: SolanaBalances | undefined,
  prices: TokenPricesData | undefined
): SolanaWalletAssets | undefined {
  if (!tokens || !balances) {
    return undefined;
  }

  const assets: SolanaWalletAsset[] = [];
  let totalUsd: bigint | undefined = prices ? 0n : undefined;

  for (const token of tokens) {
    const balance = balances[token.address];

    if (balance === undefined || balance === 0n) {
      continue;
    }

    const price = prices?.[token.address];
    const balanceUsd = price ? convertToUsd(balance, token.decimals, getMidPrice(price)) : undefined;

    assets.push({ ...token, balance, balanceUsd });
    totalUsd = totalUsd === undefined || balanceUsd === undefined ? undefined : totalUsd + balanceUsd;
  }

  return { assets: assets.sort(compareByUsd), totalUsd };
}

// Priced assets first by USD value, then unpriced ones in list order
function compareByUsd(a: SolanaWalletAsset, b: SolanaWalletAsset): number {
  if (a.balanceUsd === undefined || b.balanceUsd === undefined) {
    return Number(a.balanceUsd === undefined) - Number(b.balanceUsd === undefined);
  }

  return a.balanceUsd === b.balanceUsd ? 0 : a.balanceUsd > b.balanceUsd ? -1 : 1;
}
