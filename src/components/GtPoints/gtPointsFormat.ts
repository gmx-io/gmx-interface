import { getReferralCodeLinkParam } from "domain/referrals/utils/referralCode";
import { SOLANA_SEARCH_PARAM } from "lib/chains/chainIdSearchParam";
import { REFERRAL_CODE_QUERY_PARAM } from "lib/legacy";
import { formatAmount, formatUsd } from "lib/numbers";
import { getRootUrl } from "lib/url";
import { bigMath } from "sdk/utils/bigmath";

import { GT_DECIMALS, SOL_DECIMALS, VIP_TIERS, type GtBuybackPool, type VipTier } from "./gtPointsTypes";

const USD_DECIMALS = 30;

/** "$3.8939/GT" */
export function formatGtPrice(priceUsd: bigint) {
  return `${formatUsd(priceUsd, { displayDecimals: 4 })}/GT`;
}

/** "218.70 USDC" (USDC values are kept as USD with 30 decimals) */
export function formatUsdc(usd: bigint) {
  return `${formatAmount(usd, USD_DECIMALS, 2, true)} USDC`;
}

/** "0.0612 SOL" */
export function formatSol(amount: bigint) {
  return `${formatAmount(amount, SOL_DECIMALS, 4, true)} SOL`;
}

/**
 * Estimate for selling `amount` GT in the next buyback. Your own GT joins the queue, so the price is the max
 * buyback value divided by all GT submitted including yours, never above the pool's current estimate
 * (which already includes the minting-price cap). Proceeds can't exceed the max buyback value.
 */
export function estimateGtSale(pool: GtBuybackPool, amount: bigint) {
  const oneGt = 10n ** BigInt(GT_DECIMALS);
  const priceUsd =
    amount > 0n
      ? bigMath.min(pool.estPriceUsd, bigMath.mulDiv(pool.maxBuybackUsd, oneGt, pool.queuedGt + amount))
      : pool.estPriceUsd;
  return { priceUsd, proceedsUsd: (amount * priceUsd) / oneGt };
}

/** Referral link that also opens the app on Solana (the app reads ?chainId=solana) */
export function getGtReferralLink(code: string) {
  return `${getRootUrl()}/trade/?${REFERRAL_CODE_QUERY_PARAM}=${getReferralCodeLinkParam(code)}&chainId=${SOLANA_SEARCH_PARAM}`;
}

/** Solana address → "DemoWa…xx0001" */
export function shortenSolanaAddress(address: string) {
  return address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-6)}` : address;
}

/** Seconds → "03h 46m 12s" (days added when needed) */
export function formatCountdown(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const secs = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return days > 0 ? `${days}d ${pad(hours)}h ${pad(minutes)}m` : `${pad(hours)}h ${pad(minutes)}m ${pad(secs)}s`;
}

const ONE_GT = 10n ** BigInt(GT_DECIMALS);

// 2 decimals from 1 GT up, 4 below (small rewards like 0.0003 GT), with thousands separators.
export function formatGt(
  amount: bigint,
  { signed = false, decimals: fixedDecimals }: { signed?: boolean; decimals?: number } = {}
) {
  const abs = amount < 0n ? -amount : amount;
  const decimals = fixedDecimals ?? (abs !== 0n && abs < ONE_GT ? 4 : 2);
  const sign = amount < 0n ? "−" : signed && amount > 0n ? "+" : "";
  return `${sign}${formatAmount(abs, GT_DECIMALS, decimals, true)} GT`;
}

export function formatPercent(value: number) {
  return `${value}%`;
}

export type VipProgress = {
  current: VipTier;
  next: VipTier | undefined;
  /** GT still needed for the next tier */
  toNext: bigint;
  /** 0–100, progress from the current tier to the next one */
  percentToNext: number;
};

export function getVipProgress(balance: bigint): VipProgress {
  const current = [...VIP_TIERS].reverse().find((tier) => balance >= tier.minGt) ?? VIP_TIERS[0];
  const next = VIP_TIERS[current.level + 1];

  if (!next) {
    return { current, next: undefined, toNext: 0n, percentToNext: 100 };
  }

  const span = next.minGt - current.minGt;
  const done = balance - current.minGt;
  const percentToNext = span > 0n ? Number((done * 10_000n) / span) / 100 : 0;

  return { current, next, toNext: next.minGt - balance, percentToNext };
}
