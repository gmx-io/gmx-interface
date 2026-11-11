import { tz } from "@date-fns/tz";
import { format as formatDateFn } from "date-fns";

import { getReferralCodeLinkParam } from "domain/referrals/utils/referralCode";
import { SOLANA_SEARCH_PARAM } from "lib/chains/chainIdSearchParam";
import { REFERRAL_CODE_QUERY_PARAM } from "lib/legacy";
import { formatAmount, formatUsd } from "lib/numbers";
import { getRootUrl } from "lib/url";
import { bigMath } from "sdk/utils/bigmath";

import {
  GT_DECIMALS,
  LP_TOKEN_DECIMALS,
  MIN_STAKE_USD,
  REFERRAL_FEE_DISCOUNT,
  SOL_DECIMALS,
  VIP_TIERS,
  type GtBuybackPool,
  type GtWalletLpToken,
  type VipTier,
} from "./gtPointsTypes";

const USD_DECIMALS = 30;

/** Smallest amount of a wallet token worth MIN_STAKE_USD at its current price (undefined without a price) */
export function getMinStakeAmount({ balance, valueUsd }: Pick<GtWalletLpToken, "balance" | "valueUsd">) {
  if (balance === 0n || valueUsd === 0n) return undefined;
  return (MIN_STAKE_USD * balance + valueUsd - 1n) / valueUsd;
}

/** The minimum as shown to users ("0.79 GLV"), rounded up so typing the shown amount always passes */
export function formatMinStakeAmount(minAmount: bigint, kind: string) {
  const decimals = minAmount >= 10n ** BigInt(LP_TOKEN_DECIMALS - 1) ? 2 : 5;
  const step = 10n ** BigInt(LP_TOKEN_DECIMALS - decimals);
  const roundedUp = ((minAmount + step - 1n) / step) * step;
  return `${formatAmount(roundedUp, LP_TOKEN_DECIMALS, decimals, true)} ${kind}`;
}

type ChartAxis = { domain: [number, number]; ticks: number[]; step: number };
type AxisOptions = { padding?: number; fromZero?: boolean };

// 5 rows first, so it wins ties; then 4 and 6
const INTERVAL_CHOICES = [5, 4, 6];

/**
 * Fit one Y axis with exactly `intervals` round steps: from the values' min to max, plus 10% padding
 * on each side (never below 0), snapped out to whole steps. `coverage` is the share of the height the line uses.
 */
function fitAxis(values: number[], intervals: number, { padding = 0.1, fromZero = false }: AxisOptions = {}) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return undefined;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const range = max - min;
  // A flat line (or one that only moves by float noise) gets some room around it,
  // and doesn't decide the number of rows for the other axis
  const isFlat = range <= Math.abs(max) * 1e-4;
  const span = isFlat ? Math.abs(max) * 0.1 || 1 : range;
  // Bars always start at 0, so their length shows the value; all-zero bars get whole steps
  const lo = fromZero ? 0 : Math.max(0, min - span * padding);
  const hi = fromZero && max <= 0 ? intervals : max + span * padding;
  for (let step = getRoundStep((hi - lo) / intervals); ; step = getNextRoundStep(step)) {
    const first = Math.floor(lo / step + 1e-9);
    if ((first + intervals) * step < hi - step * 1e-9) continue;
    const ticks = Array.from({ length: intervals + 1 }, (_, index) => roundTick((first + index) * step));
    const axis: ChartAxis = { domain: [ticks[0], ticks[intervals]], ticks, step };
    const used = fromZero ? max : isFlat ? 0 : range;
    return { axis, coverage: used / (axis.domain[1] - axis.domain[0]) };
  }
}

/** A chart Y axis on round steps, with the number of steps (4–6) that lets the line fill the height best */
export function getChartAxis(values: number[], options?: AxisOptions): ChartAxis | undefined {
  let best: { axis: ChartAxis; coverage: number } | undefined;
  for (const intervals of INTERVAL_CHOICES) {
    const fit = fitAxis(values, intervals, options);
    if (fit && (!best || fit.coverage > best.coverage + 1e-9)) best = fit;
  }
  return best?.axis;
}

/**
 * The left and right Y axes of one chart: the same number of round steps on both, so their labels
 * share rows and one set of grid lines (as on the reference charts), with round values on each side.
 */
export function getPairedChartAxes(
  left: number[],
  right: number[],
  { leftFromZero = false } = {}
): { left: ChartAxis | undefined; right: ChartAxis | undefined } {
  let best: { left: ChartAxis; right: ChartAxis; coverage: number } | undefined;
  for (const intervals of INTERVAL_CHOICES) {
    const leftFit = fitAxis(left, intervals, { fromZero: leftFromZero });
    const rightFit = fitAxis(right, intervals);
    if (!leftFit || !rightFit) continue;
    const coverage = leftFit.coverage + rightFit.coverage;
    if (!best || coverage > best.coverage + 1e-9) best = { left: leftFit.axis, right: rightFit.axis, coverage };
  }
  // One side without values: the other side still gets its own axis
  return best ?? { left: getChartAxis(left, { fromZero: leftFromZero }), right: getChartAxis(right) };
}

/** Drops float noise like 3.0000000000000004 */
function roundTick(value: number) {
  return Number(value.toPrecision(12));
}

/** The next bigger round step: 1 → 2 → 2.5 → 5 → 10 (times a power of 10) */
function getNextRoundStep(step: number) {
  const magnitude = 10 ** Math.floor(Math.log10(step) + 1e-9);
  const multiplier = [2, 2.5, 5, 10].find((value) => value * magnitude > step * (1 + 1e-9)) ?? 10;
  return multiplier * magnitude;
}

function getRoundStep(roughStep: number) {
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const multiplier = [1, 2, 2.5, 5].find((value) => value * magnitude >= roughStep) ?? 10;
  return multiplier * magnitude;
}

/** How many decimals a tick step needs, e.g. 2.5 -> 1, 0.25 -> 2 (at most 6) */
function getStepDecimals(step: number) {
  for (let decimals = 0; decimals < 6; decimals++) {
    const scaled = step * 10 ** decimals;
    if (Math.abs(Math.round(scaled) - scaled) < 1e-6) return decimals;
  }
  return 6;
}

const AMOUNT_UNITS: [number, string][] = [
  [1_000_000_000, "B"],
  [1_000_000, "M"],
  [1_000, "k"],
];

/** Axis label for amounts in k / M / B, with just enough decimals for the step: "22.5M", "$60k" */
export function formatChartAmount(value: number, step: number, prefix = "") {
  if (value === 0) return `${prefix}0`;
  for (const [unit, suffix] of AMOUNT_UNITS) {
    if (Math.abs(value) >= unit) return `${prefix}${(value / unit).toFixed(getStepDecimals(step / unit))}${suffix}`;
  }
  return `${prefix}${value.toFixed(getStepDecimals(step))}`;
}

/** Axis label for USD prices: "$3.20", "$3.825", and whole dollars with commas for big steps: "$1,750" */
export function formatChartPrice(value: number, step: number) {
  const decimals = step >= 1 ? getStepDecimals(step) : Math.max(2, getStepDecimals(step));
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/** Y axis width that fits its longest tick label (11px labels) */
export function getAxisWidth(labels: string[] | undefined, minWidth: number) {
  if (!labels?.length) return minWidth;
  const longest = Math.max(...labels.map((label) => label.length));
  return Math.max(minWidth, Math.ceil(longest * 6.5) + 12);
}

/** Points of the last `days` UTC days, counted from the newest point's day (all points without `days`) */
export function filterChartPeriod<T extends { timestamp: number }>(points: T[], days: number | undefined) {
  if (!days || points.length === 0) return points;
  const lastDay = Math.floor(points[points.length - 1].timestamp / 86_400);
  return points.filter((point) => Math.floor(point.timestamp / 86_400) > lastDay - days);
}

const UTC = { in: tz("UTC") };

/** A day on a chart, in UTC like the daily data: "9 Nov" */
export function formatUtcDay(timestamp: number, pattern = "d MMM") {
  return formatDateFn(timestamp * 1000, pattern, UTC);
}

/** Table date + time with two-digit hours so rows line up: "07 Nov 2026, 04:40 PM" */
export function formatTableDateTime(timestamp: number) {
  return formatDateFn(timestamp * 1000, "dd MMM yyyy, hh:mm a");
}

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

/** Solana address → "DemoWa…xx0001" (or "Demo…0001" with `chars: 4`) */
export function shortenSolanaAddress(address: string, chars = 6) {
  return address.length > chars * 2 + 2 ? `${address.slice(0, chars)}…${address.slice(-chars)}` : address;
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

/** VIP and referral discounts multiply: 1 - (1 - VIP) x (1 - referral), in percent. VIP 8 (9%): 18.1 */
export function getCombinedFeeDiscount(vipDiscount: number, referralDiscount = REFERRAL_FEE_DISCOUNT) {
  return Math.round((1 - (1 - vipDiscount / 100) * (1 - referralDiscount / 100)) * 1000) / 10;
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
