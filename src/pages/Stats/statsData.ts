/*
 * Stats page data (design reference).
 * The page reads everything from this module, in the shapes typed under "data contract". The build task replaces the
 * "mock data" part with real data in the same shapes; the rest stays. All numbers here are mock, not protocol data.
 */
import { tz } from "@date-fns/tz";
import { t } from "@lingui/macro";
import { format } from "date-fns";

/* ---------------- data contract ---------------- */

export type Grain = "D" | "W" | "M" | "Q" | "Y";
/** flow: summed over a period (volume, fees). stock: the value at the end of a period (OI, TVL). unique: distinct wallets in a period. */
export type SeriesKind = "flow" | "stock" | "unique";
export type Unit = "usd" | "count" | "gmx" | "esgmx";

export type ChainKey = "evm" | "sol";
/** Asset groups: the same asset on different chains is one group. */
export type BucketKey = "btc" | "eth" | "sol" | "rwa" | "other";
export type FeeType = "oc" | "borrow" | "liq" | "swap";
export type TreasuryAssetKey = "stable" | "eth" | "btc" | "gmx" | "other";

/**
 * One value per UTC day: index i is the day DAYS[i] = META.start + i days, up to META.end (data through D-1).
 * Days before a series starts are 0, and there are no gaps. Flows hold the day's total, stocks the end-of-day value.
 */
export type DailyValues = Float64Array;

/** UTC seconds of the first and the last day with data. */
export type StatsMeta = { start: number; end: number };

/** Everything the charts read. Amounts are in USD unless noted. */
export type StatsDailyData = {
  /** Perps trading volume by chain and asset group. */
  volume: Record<ChainKey, Record<BucketKey, DailyValues>>;
  /** Open interest by chain and asset group (stock). */
  openInterest: Record<ChainKey, Record<BucketKey, DailyValues>>;
  /** GM pool value by chain and market group (stock). GLV is not counted twice. */
  tvl: Record<ChainKey, Record<BucketKey, DailyValues>>;
  /** Number of trades by asset group. */
  trades: Record<BucketKey, DailyValues>;
  /** Swap volume, excluding GM deposits and withdrawals. */
  swapVolume: DailyValues;
  /** Gross fees, funding excluded. The chain split and the fee-type split each add up to the total. */
  fees: DailyValues;
  feesByChain: Record<ChainKey, DailyValues>;
  feesByType: Record<FeeType, DailyValues>;
  /**
   * Distinct trading wallets per day. Distinct wallets per week, month or year can't be added up from days, so they
   * come per period: see ChartCardConfig.rowsByGrain.
   */
  activeTraders: Record<ChainKey, DailyValues>;
  /** Wallets that traded for the first time that day. */
  newTraders: Record<ChainKey, DailyValues>;
  /** GMX staked (stock, GMX) and its daily net flow (stake minus unstake, GMX). Arbitrum and Avalanche. */
  gmxStaked: DailyValues;
  gmxStakedFlow: DailyValues;
  /** esGMX staked (stock, esGMX) and its daily net flow (esGMX). Arbitrum and Avalanche. */
  esGmxStaked: DailyValues;
  esGmxStakedFlow: DailyValues;
  /** esGMX in vesting (stock, esGMX). */
  esGmxVesting: DailyValues;
  /** GMX bought back that day (GMX). */
  buyback: DailyValues;
  /** GMX price, for the USD estimates. */
  gmxPrice: DailyValues;
  /** Treasury value by asset type (stock). Excludes the buyback reserve. */
  treasury: Record<TreasuryAssetKey, DailyValues>;
  /** GLV vaults: the value of each GM market in the vault (stock), from the vault's start (UTC seconds). */
  glv: Record<string, { label: string; shortLabel: string; start: number; markets: Record<string, DailyValues> }>;
};

export type TopPeriod = "7D" | "30D" | "All";
/** Traders with their volume (USD) and trades for each period. The page sorts them and shows the top 20. */
export type TopUserRow = {
  address: string;
  chain: "Arbitrum" | "Avalanche" | "Solana";
  volume: Record<TopPeriod, number>;
  trades: Record<TopPeriod, number>;
};

export type HolderType = "wallet" | "treasury" | "exchange" | "lp";
/** The largest GMX holders by size, current snapshot. Staked GMX is counted under its owner; LP pools can't stake. */
export type HolderRow = { address: string; type: HolderType; gmx: number; staked: number };

/** GMX token snapshot, Arbitrum and Avalanche. Liquidity shares are % of the total supply. */
export type GmxTokenSnapshot = {
  supply: number;
  liquidityPct: { uniswap: number; traderJoe: number; gmxV2: number };
};

/** How each chain's fees are split, as shares of that chain's fees (0–1). */
export type FeeSplit = {
  evm: { lp: number; stakers: number; treasury: number; chainlink: number };
  sol: { gt: number; lp: number };
};

export type StatsSeries = {
  key: string;
  label: string;
  color: string;
  arr: DailyValues;
  kind?: SeriesKind;
};

/** A chart row: d = UTC start of the period; p = partial, the current period that isn't over yet. */
export type StatsRow = { d: number; p: boolean } & Record<string, number | boolean>;

/* ---------------- chart colours (DS tokens only) ---------------- */
// The design system has no categorical chart palette yet; these are picked from the existing colour tokens.
export const CHART_COLORS = {
  s1: "var(--color-blue-300)",
  s2: "var(--color-green-300)",
  s3: "var(--color-yellow-500)",
  s4: "var(--color-blue-100)",
  s5: "var(--color-red-400)",
  s6: "var(--color-green-100)",
  s7: "var(--color-red-100)",
  other: "var(--color-slate-500)",
  pos: "var(--color-green-500)",
  neg: "var(--color-red-500)",
  muted: "var(--color-slate-100)",
};

export const CHAINS: { key: ChainKey; label: string; color: string }[] = [
  { key: "evm", label: "EVM", color: CHART_COLORS.s1 },
  { key: "sol", label: "Solana", color: CHART_COLORS.s2 },
];
export const BUCKETS: { key: BucketKey; label: string; color: string }[] = [
  { key: "btc", label: "BTC", color: CHART_COLORS.s1 },
  { key: "eth", label: "ETH", color: CHART_COLORS.s2 },
  { key: "sol", label: "SOL", color: CHART_COLORS.s3 },
  { key: "rwa", label: "RWA", color: CHART_COLORS.s4 },
  { key: "other", label: "Other", color: CHART_COLORS.other },
];

/* ---------------- dates ---------------- */
export const DAY = 86400;
const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) / 1000;
export const META: StatsMeta = { start: utc(2023, 7, 13), end: utc(2026, 11, 5) };
export const START = META.start;
export const END = META.end; // data through D-1
/** The day the GMX buybacks started. */
export const BUYBACK_START = utc(2026, 3, 4);
export const DAYS: number[] = [];
for (let ts = START; ts <= END; ts += DAY) DAYS.push(ts);
export const N = DAYS.length;
export const idxOf = (ts: number) => Math.max(0, Math.round((ts - START) / DAY));

export function bucketStart(ts: number, g: Grain) {
  if (g === "D") return ts;
  const d = new Date(ts * 1000);
  if (g === "W") return ts - ((d.getUTCDay() + 6) % 7) * DAY;
  if (g === "M") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000;
  if (g === "Q") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - (d.getUTCMonth() % 3), 1) / 1000;
  return Date.UTC(d.getUTCFullYear(), 0, 1) / 1000;
}

export function bucketEnd(s: number, g: Grain) {
  if (g === "D") return s;
  const d = new Date(s * 1000);
  if (g === "W") return s + 6 * DAY;
  if (g === "M") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) / 1000 - DAY;
  if (g === "Q") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3, 1) / 1000 - DAY;
  return Date.UTC(d.getUTCFullYear() + 1, 0, 1) / 1000 - DAY;
}

const IN_UTC = { in: tz("UTC") };

/** A period's label in UTC, like the app's other charts. long = full dates, for tooltips and tables. */
export function fmtDate(ts: number, g: Grain, long?: boolean) {
  const ms = ts * 1000;
  if (g === "Y") return format(ms, "yyyy", IN_UTC);
  if (g === "Q") return format(ms, "QQQ yyyy", IN_UTC);
  if (g === "M") return format(ms, long ? "MMM yyyy" : "MMM ''yy", IN_UTC);
  if (g === "W" && long)
    return format(ms, "MMM d", IN_UTC) + " – " + format(ms + 6 * DAY * 1000, "MMM d, yyyy", IN_UTC);
  return format(ms, long ? "MMM d, yyyy" : "MMM d", IN_UTC);
}

/* ---------------- formatting ---------------- */
const SUFFIX: Partial<Record<Unit, string>> = { gmx: " GMX", esgmx: " esGMX" };
const COMPACT: [number, string][] = [
  [1e3, "K"],
  [1e6, "M"],
  [1e9, "B"],
];

export function fmtCompact(v: number, unit: Unit, dec?: number) {
  const sign = v < 0 ? "-" : "";
  const x = Math.abs(v);
  const pre = unit === "usd" ? "$" : "";
  let i = -1;
  for (let j = 0; j < COMPACT.length; j++) if (x >= COMPACT[j][0]) i = j;
  if (i < 0) {
    if (Math.round(x) < 1000) return sign + pre + Math.round(x);
    i = 0;
  }
  let [div, suffix] = COMPACT[i];
  let s = (x / div).toFixed(dec ?? (x >= div * 10 ? 0 : 1));
  // 999,950 would round to "1000K": show the next unit instead ("1.0M")
  if (Number(s) >= 1000 && i < COMPACT.length - 1) {
    [div, suffix] = COMPACT[i + 1];
    s = (x / div).toFixed(dec ?? 1);
  }
  return sign + pre + s + suffix;
}

export const fmtFull = (v: number, unit: Unit) =>
  (v < 0 ? "-" : "") +
  (unit === "usd" ? "$" : "") +
  Math.round(Math.abs(v)).toLocaleString("en-US") +
  (SUFFIX[unit] || "");

export const fmtPct = (v: number) => v.toFixed(1) + "%";

export const pctChange = (a: number, b: number) => (b ? (a / b - 1) * 100 : 0);

export const fmtAddress = (address: string) => address.slice(0, 6) + "…" + address.slice(-4);

/* ---------------- mock data (replaced with real data in the build task) ---------------- */
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(7);
const nz = (amp: number) => 1 + (rnd() * 2 - 1) * amp;
function walk(vol: number, seed: number, drift = 0) {
  const r = mulberry32(seed);
  const out = new Float64Array(N);
  let v = 0;
  for (let i = 0; i < N; i++) {
    v = v * 0.985 + (r() * 2 - 1) * vol + drift;
    out[i] = Math.exp(v);
  }
  return out;
}
function hex(r: () => number, n: number) {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(r() * 16).toString(16);
  return s;
}
const arr = () => new Float64Array(N);
const bucketArrays = (): Record<BucketKey, DailyValues> => ({
  btc: arr(),
  eth: arr(),
  sol: arr(),
  rwa: arr(),
  other: arr(),
});
const chainBucketArrays = () => ({ evm: bucketArrays(), sol: bucketArrays() });
const dowOf = (i: number) => (new Date(DAYS[i] * 1000).getUTCDay() + 6) % 7;
const yrs = (i: number) => i / 365;
const SOL_START = utc(2025, 2, 10);
const GLV_START = utc(2024, 9, 3);
const solOn = (i: number) => DAYS[i] >= SOL_START;
const solRamp = (i: number) => (solOn(i) ? Math.min(1, (DAYS[i] - SOL_START) / DAY / 120) : 0);

function sharesNorm<T extends Record<string, number>>(o: T): T {
  let s = 0;
  for (const k in o) {
    (o as Record<string, number>)[k] *= nz(0.08);
    s += o[k];
  }
  for (const k in o) (o as Record<string, number>)[k] /= s;
  return o;
}

const MOCK = (function build() {
  const wE = walk(0.03, 11);
  const wS = walk(0.045, 12);
  const wOE = walk(0.02, 13);
  const wOS = walk(0.03, 14);
  const wTE = walk(0.012, 15, 0.0002);
  const wTS = walk(0.02, 16);
  const wSw = walk(0.04, 17);
  const wA = walk(0.02, 18);
  const wSt = walk(0.004, 19, 0.00003);
  const wEs = walk(0.005, 20);
  const wV = walk(0.006, 21);
  const wPx = walk(0.02, 22);
  const WK_E = [1, 1.02, 1.04, 1.03, 1.05, 0.78, 0.72];
  const WK_S = [1, 1.03, 1.02, 1.04, 1.06, 0.66, 0.6];
  const volume = chainBucketArrays();
  const openInterest = chainBucketArrays();
  const tvl = chainBucketArrays();
  const trades = bucketArrays();
  const swapVolume = arr();
  const fees = arr();
  const feesByType: Record<FeeType, DailyValues> = { oc: arr(), borrow: arr(), liq: arr(), swap: arr() };
  const activeTraders = { evm: arr(), sol: arr() };
  const newTraders = { evm: arr(), sol: arr() };
  const gmxStaked = arr();
  const gmxStakedFlow = arr();
  const esGmxStaked = arr();
  const esGmxStakedFlow = arr();
  const buyback = arr();
  const gmxPrice = arr();
  const esGmxVesting = arr();
  for (let i = 0; i < N; i++) {
    const yr = yrs(i);
    const dw = dowOf(i);
    const cyc = 1 + 0.18 * Math.sin((2 * Math.PI * yr) / 1.4);
    const vE = 55e6 * cyc * wE[i] * WK_E[dw] * nz(0.12);
    const vS = solOn(i) ? 21e6 * solRamp(i) * wS[i] * WK_S[dw] * nz(0.18) : 0;
    const rwa = 0.03 + 0.09 * Math.min(1, yr / 3.3);
    const shE: Record<string, number> = sharesNorm({
      btc: 0.36,
      eth: 0.3,
      sol: 0.08,
      rwa,
      other: Math.max(0.05, 0.26 - rwa),
    });
    const shS: Record<string, number> = sharesNorm({
      btc: 0.24,
      eth: 0.14,
      sol: 0.4,
      rwa: 0.05 + 0.05 * solRamp(i),
      other: 0.12,
    });
    const oE = 160e6 * cyc * wOE[i];
    const oS = 44e6 * solRamp(i) * wOS[i];
    const tE = 360e6 * (1 + 0.25 * Math.min(1, yr / 3.3)) * wTE[i];
    const tS = 38e6 * solRamp(i) * wTS[i];
    for (const b of BUCKETS) {
      volume.evm[b.key][i] = vE * shE[b.key];
      volume.sol[b.key][i] = vS * shS[b.key];
      openInterest.evm[b.key][i] = oE * shE[b.key];
      openInterest.sol[b.key][i] = oS * shS[b.key];
      tvl.evm[b.key][i] = tE * shE[b.key];
      tvl.sol[b.key][i] = tS * shS[b.key];
      trades[b.key][i] = Math.round((vE * shE[b.key] + vS * shS[b.key]) / (2600 * nz(0.1)));
    }
    swapVolume[i] = 4.2e6 * wSw[i] * nz(0.25) * (solOn(i) ? 1.15 : 1);
    const fee = vE * 0.00065 + vS * 0.0005 + swapVolume[i] * 0.0007;
    fees[i] = fee;
    const sp = sharesNorm({ oc: 0.56, borrow: 0.28, liq: 0.05, swap: 0.11 });
    feesByType.oc[i] = fee * sp.oc;
    feesByType.borrow[i] = fee * sp.borrow;
    feesByType.liq[i] = fee * sp.liq;
    feesByType.swap[i] = fee * sp.swap;
    nz(0.3); // was the funding series (its chart was dropped); keeps the random sequence of the series below
    activeTraders.evm[i] = Math.round(3200 * cyc * wA[i] * (dw >= 5 ? 0.82 : 1) * nz(0.08));
    activeTraders.sol[i] = Math.round(1350 * solRamp(i) * (dw >= 5 ? 0.7 : 1) * nz(0.12));
    newTraders.evm[i] = Math.round(260 * (1 - 0.18 * Math.min(1, yr / 3.3)) * nz(0.25));
    newTraders.sol[i] = Math.round(solOn(i) ? 130 * Math.max(0.4, solRamp(i)) * nz(0.3) * (rnd() < 0.02 ? 3 : 1) : 0);
    gmxStaked[i] = 6.4e6 * wSt[i];
    esGmxStaked[i] = 1.9e6 * wEs[i];
    esGmxVesting[i] = 1.1e6 * wV[i];
    gmxStakedFlow[i] = i ? gmxStaked[i] - gmxStaked[i - 1] : 0;
    esGmxStakedFlow[i] = i ? esGmxStaked[i] - esGmxStaked[i - 1] : 0;
    gmxPrice[i] = 14 * wPx[i];
    buyback[i] = DAYS[i] >= BUYBACK_START && dw === 2 ? 9000 * nz(0.35) : 0;
  }

  // GLV vaults
  const vaults: Record<string, { label: string; shortLabel: string; base: number; mix: Record<string, number> }> = {
    "eth-usdc": {
      label: "GLV · ETH-USDC",
      shortLabel: "ETH-USDC",
      base: 120e6,
      mix: { eth: 0.42, btc: 0.18, sol: 0.1, doge: 0.09, link: 0.08, arb: 0.07, other: 0.06 },
    },
    "btc-usdc": {
      label: "GLV · BTC-USDC",
      shortLabel: "BTC-USDC",
      base: 85e6,
      mix: { btc: 0.55, eth: 0.15, sol: 0.1, xrp: 0.1, other: 0.1 },
    },
  };
  const glv: StatsDailyData["glv"] = {};
  let seed = 40;
  for (const id in vaults) {
    const v = vaults[id];
    const w = walk(0.015, seed++);
    const markets: Record<string, DailyValues> = {};
    for (const k in v.mix) markets[k] = arr();
    for (let i = idxOf(GLV_START); i < N; i++) {
      const ramp = Math.min(1, (DAYS[i] - GLV_START) / DAY / 90);
      const sh = sharesNorm({ ...v.mix });
      for (const k in v.mix) markets[k][i] = v.base * ramp * w[i] * sh[k];
    }
    glv[id] = { label: v.label, shortLabel: v.shortLabel, start: GLV_START, markets };
  }

  // fees by chain
  const feesEvm = arr();
  const feesSol = arr();
  for (let i = 0; i < N; i++) {
    let perpsEvm = 0;
    for (const b of BUCKETS) perpsEvm += volume.evm[b.key][i];
    feesEvm[i] = perpsEvm * 0.00065 + swapVolume[i] * 0.0007 * (solOn(i) ? 1 / 1.15 : 1);
    feesSol[i] = Math.max(0, fees[i] - feesEvm[i]);
  }

  // treasury: the latest values mirror the treasury wallets' composition; the history before it is mock
  const TREASURY_LAST: Record<TreasuryAssetKey, number> = {
    stable: 6.41e6,
    eth: 6.49e6,
    btc: 3.35e6,
    gmx: 2.42e6,
    other: 0.97e6,
  };
  const treasury = {} as Record<TreasuryAssetKey, DailyValues>;
  (Object.keys(TREASURY_LAST) as TreasuryAssetKey[]).forEach((key, j) => {
    const w = walk(0.02, 200 + j);
    const out = arr();
    for (let i = 0; i < N; i++) out[i] = (TREASURY_LAST[key] * w[i]) / w[N - 1];
    treasury[key] = out;
  });

  const data: StatsDailyData = {
    volume,
    openInterest,
    tvl,
    trades,
    swapVolume,
    fees,
    feesByChain: { evm: feesEvm, sol: feesSol },
    feesByType,
    activeTraders,
    newTraders,
    gmxStaked,
    gmxStakedFlow,
    esGmxStaked,
    esGmxStakedFlow,
    esGmxVesting,
    buyback,
    gmxPrice,
    treasury,
    glv,
  };
  return data;
})();

export const M: StatsDailyData = MOCK;

export const TOP_USERS: TopUserRow[] = (function () {
  const r = mulberry32(99);
  const out: TopUserRow[] = [];
  const b58 = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";
  for (let i = 0; i < 40; i++) {
    const sol = r() < 0.3;
    const all = (2.4e9 / Math.pow(i + 1, 0.85)) * (0.7 + r() * 0.6);
    const d30 = all * (0.02 + r() * 0.08);
    const d7 = d30 * (0.12 + r() * 0.3);
    out.push({
      address: sol ? hex(r, 44).replace(/[0-9a-f]/g, (c) => b58[(parseInt(c, 16) * 3) % 58]) : "0x" + hex(r, 40),
      chain: sol ? "Solana" : r() < 0.75 ? "Arbitrum" : "Avalanche",
      volume: { "7D": d7, "30D": d30, All: all },
      trades: { "7D": Math.round(d7 / 9e4), "30D": Math.round(d30 / 9e4), All: Math.round(all / 9e4) },
    });
  }
  return out;
})();

export const GMX_TOKEN: GmxTokenSnapshot = {
  supply: 10.2e6,
  liquidityPct: { uniswap: 6.9, traderJoe: 3.6, gmxV2: 5.1 },
};

export const HOLDERS: HolderRow[] = (function () {
  const r = mulberry32(123);
  const out: HolderRow[] = [];
  const forced: Record<number, HolderType> = {
    2: "exchange",
    4: "treasury",
    6: "lp",
    9: "exchange",
    12: "treasury",
    15: "lp",
    18: "exchange",
  };
  for (let i = 0; i < 120; i++) {
    const type = forced[i] || "wallet";
    const gmx = Math.round((1.0e6 / Math.pow(i + 1, 1.05)) * (0.75 + r() * 0.5));
    const share = type === "wallet" ? (r() < 0.6 ? 0.8 + r() * 0.2 : r() * 0.4) : type === "treasury" ? r() * 0.05 : 0;
    out.push({ address: "0x" + hex(r, 40), type, gmx, staked: Math.round(gmx * share) });
  }
  return out;
})();

export const FEE_SPLIT: FeeSplit = {
  evm: { lp: 0.63, stakers: 0.27, treasury: 0.088, chainlink: 0.012 },
  sol: { gt: 0.99, lp: 0.01 },
};

/* ---------------- derived series ---------------- */
const addArrays = (...list: DailyValues[]) => {
  const out = arr();
  for (const a of list) for (let i = 0; i < N; i++) out[i] += a[i];
  return out;
};
const sumAll = (list: DailyValues[]) => list.reduce((s, a) => s + a.reduce((x, y) => x + y, 0), 0);
type ByChainBucket = Record<ChainKey, Record<BucketKey, DailyValues>>;
const sumChain = (o: ByChainBucket, c: ChainKey) => addArrays(...BUCKETS.map((b) => o[c][b.key]));
const byChain = (o: ByChainBucket): Record<ChainKey, DailyValues> => ({
  evm: sumChain(o, "evm"),
  sol: sumChain(o, "sol"),
});
const byBucket = (o: ByChainBucket) => {
  const out = {} as Record<BucketKey, DailyValues>;
  for (const b of BUCKETS) out[b.key] = addArrays(o.evm[b.key], o.sol[b.key]);
  return out;
};

const VOL_BY_CHAIN = byChain(M.volume);
const VOL_BY_BUCKET = byBucket(M.volume);
const OI_BY_CHAIN = byChain(M.openInterest);
const OI_BY_BUCKET = byBucket(M.openInterest);
const TVL_BY_CHAIN = byChain(M.tvl);
const TVL_BY_BUCKET = byBucket(M.tvl);
const TREASURY_MAJORS = addArrays(M.treasury.eth, M.treasury.btc);

export const TOTAL_VOL = addArrays(VOL_BY_CHAIN.evm, VOL_BY_CHAIN.sol, M.swapVolume);
export const OI_TOTAL = addArrays(OI_BY_CHAIN.evm, OI_BY_CHAIN.sol);
export const TVL_TOTAL = addArrays(TVL_BY_CHAIN.evm, TVL_BY_CHAIN.sol);
export const ALL_TIME = {
  users: sumAll([M.newTraders.evm, M.newTraders.sol]),
  volume: sumAll([TOTAL_VOL]),
  fees: sumAll([M.fees]),
};

/* ---------------- aggregation ---------------- */
// MOCK ONLY: distinct wallets per week, month or year can't be built from daily counts. Real data comes per period
// (ChartCardConfig.rowsByGrain); this factor only makes the mock look plausible.
const UNIQUE_FACTOR: Record<Grain, number> = { D: 1, W: 0.42, M: 0.26, Q: 0.18, Y: 0.12 };

/** Daily values → one row per period. Flows add up, stocks keep the period's last day. Only the current period is partial. */
export function aggregate(series: StatsSeries[], kind: SeriesKind, g: Grain, fromIdx: number): StatsRow[] {
  const rows: StatsRow[] = [];
  const maxes: Record<string, number>[] = [];
  let cur: StatsRow | null = null;
  let curMax: Record<string, number> = {};
  for (let i = fromIdx; i < N; i++) {
    const b = bucketStart(DAYS[i], g);
    if (!cur || cur.d !== b) {
      cur = { d: b, p: bucketEnd(b, g) > END } as StatsRow;
      curMax = {};
      rows.push(cur);
      maxes.push(curMax);
      for (const s of series) {
        cur[s.key] = 0;
        curMax[s.key] = 0;
      }
    }
    for (const s of series) {
      const v = s.arr[i];
      const k = s.kind || kind;
      if (k === "stock") cur[s.key] = v;
      else cur[s.key] = (cur[s.key] as number) + v;
      if (v > curMax[s.key]) curMax[s.key] = v;
    }
  }
  rows.forEach((r, ri) => {
    for (const s of series)
      if ((s.kind || kind) === "unique" && g !== "D")
        r[s.key] = Math.round(Math.max(maxes[ri][s.key], (r[s.key] as number) * UNIQUE_FACTOR[g]));
  });
  return rows;
}

/** The rows that fall inside [from, to] (UTC seconds). A range after the last period shows the last period. */
export function sliceRows(rows: StatsRow[], g: Grain, from: number, to: number): [number, number] {
  let si = rows.findIndex((r) => bucketEnd(r.d, g) >= from);
  if (si < 0) si = rows.length - 1;
  let ei = rows.length - 1;
  while (ei > 0 && rows[ei].d > to) ei--;
  if (ei < si) ei = si;
  return [si, ei];
}

/* ---------------- chart card configs ---------------- */
export type ChartType = "stackedBar" | "bar" | "line" | "area" | "pct" | "barCum" | "flowTotal";

export type ChartVariant = { id: string; label: string; shortLabel?: string; series: StatsSeries[]; fromIdx?: number };

export type ChartCardConfig = {
  id: string;
  title: string;
  unit: Unit;
  kind: SeriesKind;
  types: ChartType[];
  series?: StatsSeries[];
  variants?: ChartVariant[];
  variantSeg?: string;
  grains?: Grain[];
  fromIdx?: number;
  cumulative?: boolean;
  /** GMX price per day: the tooltip adds a USD estimate (amount × the period's average price). */
  usdPrice?: DailyValues;
  /** Rows per period from the source, used instead of adding up days (needed for distinct wallets). */
  rowsByGrain?: Partial<Record<Grain, StatsRow[]>>;
  composite?: boolean;
  pctStyle?: "area";
  periodLabel?: string;
  breakdown?: string;
  note?: string;
  badge?: string;
  span2?: boolean;
};

export type SpecialCard = { special: "top" | "holders" | "holdings" | "feeflow" };
export type CardConfig = ChartCardConfig | SpecialCard;
export type SectionTop = "treasuryKpis" | "gmxToken" | "buybackKpis" | "tvlTotal";
export type TabId = "overview" | "revenue" | "protocol" | "liquidity";
export type TabConfig = {
  id: TabId;
  label: string;
  overview?: boolean;
  sections: { label?: string; top?: SectionTop; cards: CardConfig[] }[];
};

export const TAB_IDS: TabId[] = ["overview", "revenue", "protocol", "liquidity"];

/* ---------------- page layout (labels follow the app language) ---------------- */
const S = (meta: Omit<StatsSeries, "arr">, a: DailyValues): StatsSeries => ({ ...meta, arr: a });
const bucketLabel = (b: { key: BucketKey; label: string }) => (b.key === "other" ? t`Other` : b.label);
const chainSeries = (by: Record<ChainKey, DailyValues>) => CHAINS.map((c) => S(c, by[c.key]));
const bucketSeries = (by: Record<BucketKey, DailyValues>) =>
  BUCKETS.map((b) => S({ key: b.key, label: bucketLabel(b), color: b.color }, by[b.key]));

export function getTreasuryNote() {
  return t`The four treasury wallets: DAO Treasury, POL multisig, and the old fee treasuries on Arbitrum and Avalanche. Valued at end of day. Excludes the buyback reserve, which is shown under Buyback.`;
}

export function getTreasuryGroups(): ChartVariant[] {
  const assets: { key: TreasuryAssetKey; label: string; color: string }[] = [
    { key: "stable", label: t`Stablecoins`, color: CHART_COLORS.s2 },
    { key: "eth", label: "ETH", color: CHART_COLORS.s3 },
    { key: "btc", label: "BTC", color: CHART_COLORS.s4 },
    { key: "gmx", label: t`GMX (own token)`, color: CHART_COLORS.s1 },
    { key: "other", label: t`Other tokens`, color: CHART_COLORS.other },
  ];
  return [
    {
      id: "asset",
      label: t`Asset type`,
      series: assets.map((a) => S(a, M.treasury[a.key])),
    },
    {
      id: "liq",
      label: t`Liquidity`,
      series: [
        S({ key: "cash", label: t`Cash and stable pools`, color: CHART_COLORS.s2 }, M.treasury.stable),
        S({ key: "majors", label: t`ETH and BTC`, color: CHART_COLORS.s3 }, TREASURY_MAJORS),
        S({ key: "other", label: t`Other tokens`, color: CHART_COLORS.other }, M.treasury.other),
        S({ key: "gmx", label: t`GMX (own token)`, color: CHART_COLORS.s1 }, M.treasury.gmx),
      ],
    },
  ];
}

const GLV_COLORS: Record<string, string> = {
  btc: CHART_COLORS.s1,
  eth: CHART_COLORS.s2,
  sol: CHART_COLORS.s3,
  doge: CHART_COLORS.s4,
  link: CHART_COLORS.s5,
  arb: CHART_COLORS.s6,
  xrp: CHART_COLORS.s7,
  other: CHART_COLORS.other,
};
const glvLabel = (key: string) => (key === "other" ? t`Other` : key.toUpperCase());

let tabsCache: { locale: string; tabs: TabConfig[] } | undefined;

/** The page: tabs, sections and chart cards in the prototype's order. Built once per app language. */
export function getStatsTabs(locale: string): TabConfig[] {
  if (tabsCache?.locale !== locale) tabsCache = { locale, tabs: buildTabs() };
  return tabsCache.tabs;
}

function buildTabs(): TabConfig[] {
  const byChainLabel = t`By chain`;
  const byAssetLabel = t`By asset`;
  const tradingVolume = t`Trading volume`;
  const openInterest = t`Open interest`;
  const totalStaked = t`Total staked`;
  const netFlow = t`Net flow`;
  const arbitrumAndAvalanche = t`Arbitrum and Avalanche.`;
  const tvlTitle = t`TVL (GM pool value)`;
  return [
    {
      id: "overview",
      label: t`Overview`,
      overview: true,
      sections: [
        {
          label: t`Volume and open interest`,
          cards: [
            {
              id: "pv-chain",
              title: tradingVolume,
              breakdown: byChainLabel,
              unit: "usd",
              kind: "flow",
              series: chainSeries(VOL_BY_CHAIN),
              types: ["stackedBar", "line", "pct"],
            },
            {
              id: "pv-bucket",
              title: tradingVolume,
              breakdown: byAssetLabel,
              unit: "usd",
              kind: "flow",
              series: bucketSeries(VOL_BY_BUCKET),
              types: ["stackedBar", "line", "pct"],
              note: t`The same asset on different chains is one group.`,
            },
            {
              id: "oi-chain",
              title: openInterest,
              breakdown: byChainLabel,
              unit: "usd",
              kind: "stock",
              series: chainSeries(OI_BY_CHAIN),
              types: ["area", "pct"],
            },
            {
              id: "oi-bucket",
              title: openInterest,
              breakdown: byAssetLabel,
              unit: "usd",
              kind: "stock",
              series: bucketSeries(OI_BY_BUCKET),
              types: ["area", "pct"],
            },
            {
              id: "swap",
              title: t`Swap volume`,
              unit: "usd",
              kind: "flow",
              series: [S({ key: "v", label: t`Swap volume`, color: CHART_COLORS.s1 }, M.swapVolume)],
              types: ["bar", "line"],
              note: t`Excludes GM deposits and withdrawals.`,
            },
          ],
        },
        {
          label: t`Traders`,
          cards: [
            {
              id: "active",
              title: t`Active traders`,
              breakdown: byChainLabel,
              unit: "count",
              kind: "unique",
              series: chainSeries(M.activeTraders),
              types: ["stackedBar", "line", "pct"],
            },
            {
              id: "new",
              title: t`New traders`,
              breakdown: byChainLabel,
              unit: "count",
              kind: "flow",
              series: chainSeries(M.newTraders),
              types: ["stackedBar", "line", "pct"],
              note: t`A wallet counts on the day of its first trade.`,
            },
            {
              id: "trades",
              title: t`Number of trades`,
              breakdown: byAssetLabel,
              unit: "count",
              kind: "flow",
              series: bucketSeries(M.trades),
              types: ["stackedBar", "line", "pct"],
            },
            { special: "top" },
          ],
        },
      ],
    },
    {
      id: "revenue",
      label: t`Revenue`,
      sections: [
        {
          cards: [
            {
              id: "fees",
              title: t`Fees`,
              unit: "usd",
              kind: "flow",
              series: [S({ key: "v", label: t`Fees`, color: CHART_COLORS.s1 }, M.fees)],
              types: ["bar", "line", "barCum"],
              cumulative: true,
              note: t`Gross fees; funding is excluded.`,
            },
            {
              id: "fees-chain",
              title: t`Fees`,
              breakdown: byChainLabel,
              unit: "usd",
              kind: "flow",
              series: chainSeries(M.feesByChain),
              types: ["stackedBar", "line", "pct"],
              note: t`Gross fees by chain; funding is excluded.`,
            },
            {
              id: "split",
              title: t`Fee split`,
              breakdown: t`By fee type`,
              unit: "usd",
              kind: "flow",
              series: [
                S({ key: "oc", label: t`Open/close`, color: CHART_COLORS.s1 }, M.feesByType.oc),
                S({ key: "borrow", label: t`Borrowing`, color: CHART_COLORS.s2 }, M.feesByType.borrow),
                S({ key: "liq", label: t`Liquidation`, color: CHART_COLORS.s3 }, M.feesByType.liq),
                S({ key: "swap", label: t`Swap`, color: CHART_COLORS.s4 }, M.feesByType.swap),
              ],
              types: ["stackedBar", "line", "pct"],
            },
            { special: "feeflow" },
          ],
        },
      ],
    },
    {
      id: "protocol",
      label: t`Protocol`,
      sections: [
        {
          label: t`Treasury`,
          top: "treasuryKpis",
          cards: [
            { special: "holdings" },
            {
              id: "treasury",
              title: t`Treasury over time`,
              unit: "usd",
              kind: "stock",
              variants: getTreasuryGroups(),
              variantSeg: t`Group by`,
              types: ["area", "pct"],
              note: getTreasuryNote(),
            },
          ],
        },
        {
          label: t`GMX token`,
          top: "gmxToken",
          cards: [
            {
              id: "gmx-staked",
              title: t`GMX staked`,
              unit: "gmx",
              kind: "stock",
              composite: true,
              series: [
                S({ key: "total", label: totalStaked, color: CHART_COLORS.s1 }, M.gmxStaked),
                S({ key: "flow", label: netFlow, color: CHART_COLORS.pos, kind: "flow" }, M.gmxStakedFlow),
              ],
              types: ["flowTotal", "line"],
              note: arbitrumAndAvalanche,
            },
            { special: "holders" },
          ],
        },
        {
          label: t`Buyback`,
          top: "buybackKpis",
          cards: [
            {
              id: "buyback",
              title: t`Weekly bought GMX`,
              unit: "gmx",
              kind: "flow",
              span2: true,
              grains: ["W", "M", "Y"],
              fromIdx: idxOf(BUYBACK_START),
              series: [S({ key: "v", label: t`GMX bought`, color: CHART_COLORS.s1 }, M.buyback)],
              types: ["barCum", "bar"],
              cumulative: true,
              usdPrice: M.gmxPrice,
              periodLabel: t`GMX bought per period`,
              note: t`USD = GMX × average GMX price of the period (estimate). No daily view: the source is weekly or monthly.`,
            },
          ],
        },
        {
          label: "esGMX",
          cards: [
            {
              id: "es-staked",
              title: t`esGMX staked`,
              unit: "esgmx",
              kind: "stock",
              composite: true,
              series: [
                S({ key: "total", label: totalStaked, color: CHART_COLORS.s1 }, M.esGmxStaked),
                S({ key: "flow", label: netFlow, color: CHART_COLORS.pos, kind: "flow" }, M.esGmxStakedFlow),
              ],
              types: ["flowTotal", "line"],
              note: arbitrumAndAvalanche,
            },
            {
              id: "vesting",
              title: t`esGMX vesting`,
              unit: "esgmx",
              kind: "stock",
              series: [S({ key: "v", label: t`esGMX vesting`, color: CHART_COLORS.s1 }, M.esGmxVesting)],
              types: ["line", "bar"],
              badge: t`Metric TBD`,
              note: t`Shown as the amount vesting (a stock); the alternative is esGMX vested per period (a flow).`,
            },
          ],
        },
      ],
    },
    {
      id: "liquidity",
      label: t`Liquidity`,
      sections: [
        {
          top: "tvlTotal",
          cards: [
            {
              id: "tvl-chain",
              title: tvlTitle,
              breakdown: byChainLabel,
              unit: "usd",
              kind: "stock",
              series: chainSeries(TVL_BY_CHAIN),
              types: ["area", "pct"],
              note: t`GM pool value only; GLV is not counted twice.`,
            },
            {
              id: "tvl-market",
              title: tvlTitle,
              breakdown: t`By market`,
              unit: "usd",
              kind: "stock",
              series: bucketSeries(TVL_BY_BUCKET),
              types: ["area", "pct"],
              badge: t`Market = bucket?`,
              note: t`Shown by market group; a per-asset view is to be decided.`,
            },
            {
              id: "glv",
              title: t`GLV composition`,
              unit: "usd",
              kind: "stock",
              span2: true,
              types: ["pct", "area"],
              pctStyle: "area",
              variants: Object.keys(M.glv).map((id) => ({
                id,
                label: M.glv[id].label,
                shortLabel: M.glv[id].shortLabel,
                fromIdx: idxOf(M.glv[id].start),
                series: Object.keys(M.glv[id].markets).map((k) =>
                  S({ key: k, label: glvLabel(k), color: GLV_COLORS[k] }, M.glv[id].markets[k])
                ),
              })),
              note: t`Value and % share of each GM market in the vault. Same-asset vaults on different chains are merged.`,
            },
          ],
        },
      ],
    },
  ];
}
