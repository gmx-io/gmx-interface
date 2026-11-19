import type { SolanaBalances } from "lib/solana/balances";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";
import type { TokenPricesData } from "sdk/utils/tokens/types";

export type SolanaWalletToken = {
  address: string;
  symbol: string;
  iconSymbol: string;
  name: string;
  decimals: number;
  isStable: boolean | undefined;
};

export type SolanaWalletAsset = SolanaWalletToken & {
  balance: bigint;
  balanceUsd: bigint | undefined;
};

export type SolanaWalletAssets = {
  assets: SolanaWalletAsset[];
  totalUsd: bigint | undefined;
};

export function getSolanaWalletAssets({
  tokens,
  balances,
  prices,
}: {
  tokens: readonly SolanaWalletToken[] | undefined;
  balances: SolanaBalances | undefined;
  prices: TokenPricesData | undefined;
}): SolanaWalletAssets | undefined {
  if (!tokens || !balances) {
    return undefined;
  }

  const assets: SolanaWalletAsset[] = [];
  let totalUsd: bigint | undefined = 0n;

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

function compareByUsd(a: SolanaWalletAsset, b: SolanaWalletAsset): number {
  if (a.balanceUsd === undefined || b.balanceUsd === undefined) {
    return Number(a.balanceUsd === undefined) - Number(b.balanceUsd === undefined);
  }

  return a.balanceUsd === b.balanceUsd ? 0 : a.balanceUsd > b.balanceUsd ? -1 : 1;
}
