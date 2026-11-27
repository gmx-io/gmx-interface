import type { MultichainMarketTokenBalances } from "domain/multichain/types";
import type { GlvOrMarketInfo } from "domain/synthetics/markets";

import type { AssetCardEarnings } from "components/Earn/Portfolio/AssetsList/GmGlvAssetCard";

// GT has 7 decimals, like the GT in the incentives code. Confirm when the Solana data is wired.
export const SOLANA_GT_DECIMALS = 7;

// Placeholders until the GT Points page exists (separate design task).
export const GT_POINTS_MY_PATH = "/gt-points/my";
export const GT_POINTS_BUYBACK_PATH = "/gt-points/buyback";
export const GT_DOCS_URL = "https://docs.gmx.io/";

export type SolanaEarnGtData = {
  /** GT in the wallet */
  balance: bigint;
  /** GT earned from staking GM/GLV that is not claimed yet */
  unclaimedFromStaking: bigint;
  /** All USDC received from selling GT in buybacks */
  lifetimeBuybackUsd: bigint;
  /** USDC received in the last buyback */
  lastBuybackUsd: bigint;
  /** GT that can be sold in the next buyback */
  sellableAmount: bigint;
  /** Sellable GT at the current minting price (the highest possible buyback price) */
  maxSellableUsd: bigint;
  /** All GT, including unclaimed, at the current minting price */
  potentialValueUsd: bigint;
};

export type SolanaEarnLpData = {
  gmLifetimeUsd: bigint;
  glvLifetimeUsd: bigint;
  last7dUsd: bigint;
  expected365dUsd: bigint;
};

export type SolanaEarnAsset = {
  info: GlvOrMarketInfo;
  balances: MultichainMarketTokenBalances;
  earnings: AssetCardEarnings;
  totalPerformanceApy: bigint | undefined;
  performanceApy30d: bigint | undefined;
};

export type SolanaEarnData = {
  account: string | undefined;
  isWalletInitializing: boolean;
  isLoading: boolean;
  gt: SolanaEarnGtData | undefined;
  lp: SolanaEarnLpData | undefined;
  assets: SolanaEarnAsset[];
};
