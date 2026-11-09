// Tester for the Solana Referrals design review: sample states, shown only outside gmx.io. Never merged.
import { USD_DECIMALS } from "config/factors";
import { expandDecimals } from "lib/numbers";

import {
  SOLANA_GT_DECIMALS,
  type SolanaAffiliateData,
  type SolanaGtHolder,
  type SolanaReferee,
  type SolanaReferralActivity,
  type SolanaReferralsData,
  type SolanaTraderPoint,
} from "../solanaReferralsTypes";

export const SOLANA_REFERRALS_TESTER_SCENARIOS = [
  "live",
  "disconnected",
  "noCode",
  "trader",
  "affiliateNew",
  "affiliate",
  "big",
  "loading",
] as const;

export type SolanaReferralsTesterScenario = (typeof SOLANA_REFERRALS_TESTER_SCENARIOS)[number];

const HOUR = 3600;
const DAY = 24 * HOUR;
const TESTER_ACCOUNT = "DemoWa11et1111111111111111111111111111110000";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";

// Obviously fake Solana-style addresses: "Demo" + two letters + ones + a number.
function demoAddress(index: number) {
  const letters = ALPHABET[index % ALPHABET.length] + ALPHABET[(index * 7 + 3) % ALPHABET.length];
  return `Demo${letters}${"1".repeat(34)}${String(index).padStart(4, "0")}`;
}

// Small seeded random, so every reload shows the same fake numbers.
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function usd(amount: number) {
  return (BigInt(Math.round(amount * 100)) * expandDecimals(1, USD_DECIMALS)) / 100n;
}

function gt(amount: number) {
  return BigInt(Math.round(amount * 10 ** SOLANA_GT_DECIMALS));
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function traderPoints({
  seed,
  chance,
  minUsd,
  maxUsd,
}: {
  seed: number;
  chance: number;
  minUsd: number;
  maxUsd: number;
}): SolanaTraderPoint[] {
  const random = seededRandom(seed);
  const end = Math.floor(nowSeconds() / HOUR) * HOUR;
  const points: SolanaTraderPoint[] = [];

  for (let timestamp = end - 365 * DAY; timestamp <= end; timestamp += HOUR) {
    if (random() > chance) continue;
    const volumeUsd = usd(minUsd + random() * (maxUsd - minUsd));
    // 0.06% open/close fee, 10% of it discounted
    points.push({ timestamp, volumeUsd, discountsUsd: (volumeUsd * 6n) / 100_000n });
  }

  return points;
}

const CODES = [
  "ALPHA",
  "SATURN",
  "GTWHALE",
  undefined,
  "DEGEN",
  "ZEPHYR",
  "DELTA",
  "KAPPA",
  undefined,
  "MAGMA",
  "NEBULA",
  "PLANET",
  "TUNDRA",
  "VEGA",
  undefined,
  "EMBER",
  "BRAVE",
  "CHASE",
  "SWAN",
  "RUBY",
];

function topHolders(): SolanaGtHolder[] {
  const random = seededRandom(7);
  let balance = 1_254_300;

  return CODES.map((referralCode, index) => {
    const holder = { rank: index + 1, address: demoAddress(100 + index), gtBalance: gt(balance), referralCode };
    balance = Math.round(balance * (0.62 + random() * 0.3));
    return holder;
  });
}

function referees({ count, seed, scale }: { count: number; seed: number; scale: number }): SolanaReferee[] {
  const random = seededRandom(seed);
  const now = nowSeconds();

  return Array.from({ length: count }, (_, index) => {
    const joinedAt = now - Math.round((5 + random() * 170) * DAY);
    const hasTraded = random() > 0.15;
    const gtEarned = hasTraded ? (0.4 + random() * 12) * scale : 0;
    return {
      address: demoAddress(index + 1),
      joinedAt,
      gtEarned: gt(gtEarned),
      sellableQuotaEarned: gt(gtEarned * 1.05),
      lastTradeAt: hasTraded ? Math.min(now - HOUR, joinedAt + Math.round(random() * (now - joinedAt))) : undefined,
    };
  }).sort((a, b) => (b.lastTradeAt ?? 0) - (a.lastTradeAt ?? 0));
}

function activity({
  list,
  count,
  seed,
  scale,
}: {
  list: SolanaReferee[];
  count: number;
  seed: number;
  scale: number;
}): SolanaReferralActivity[] {
  const random = seededRandom(seed);
  const traders = list.filter((referee) => referee.lastTradeAt !== undefined);
  let timestamp = nowSeconds() - 11 * 60;

  return Array.from({ length: count }, (_, index) => {
    const reward = (0.02 + random() * 0.3) * scale;
    const record = {
      id: String(index),
      timestamp,
      referee: traders[Math.floor(random() * traders.length)]?.address ?? demoAddress(1),
      gtReward: gt(reward),
      sellableQuota: gt(reward * 1.05),
    };
    timestamp -= Math.round((random() < 0.7 ? 60 + random() * 600 : 3 * HOUR + random() * 2 * DAY) * 1);
    return record;
  });
}

function affiliate({
  code,
  rewardRatePercent,
  totalReferrals,
  activeReferrals,
  refereeCount,
  activityCount,
  scale,
}: {
  code: string;
  rewardRatePercent: number;
  totalReferrals: number;
  activeReferrals: number;
  refereeCount: number;
  activityCount: number;
  scale: number;
}): SolanaAffiliateData {
  const list = referees({ count: refereeCount, seed: 11, scale });
  const records = refereeCount > 0 ? activity({ list, count: activityCount, seed: 13, scale }) : [];

  // Keep "Last trade" in line with the newest reward from that referee.
  for (const referee of list) {
    const newest = records.find((record) => record.referee === referee.address);
    if (newest) referee.lastTradeAt = newest.timestamp;
  }
  list.sort((a, b) => (b.lastTradeAt ?? 0) - (a.lastTradeAt ?? 0));

  // When the list holds every referee, "active" counts those who traded in the last 7 days.
  const weekAgo = nowSeconds() - 7 * DAY;
  const isFullList = totalReferrals === list.length;

  return {
    code,
    rewardRatePercent,
    totalReferrals,
    activeReferrals: isFullList
      ? list.filter((referee) => (referee.lastTradeAt ?? 0) >= weekAgo).length
      : activeReferrals,
    referees: list,
    activity: records,
  };
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function fakeApply(code: string) {
  await wait(1200);
  // UNUSED follows the Solana code rules but nobody owns it
  if (code.trim().toUpperCase() === "UNUSED") throw new Error("Code not found");
}

async function fakeCreate(code: string) {
  await wait(1200);
  if (code.trim().toUpperCase() === "TAKEN") throw new Error("Code already taken");
}

// One fake wallet per state: switching states acts like switching wallets.
function testerAccount(scenario: SolanaReferralsTesterScenario) {
  const index = ["disconnected", "noCode", "trader", "affiliateNew", "affiliate", "big", "loading"].indexOf(scenario);
  return `${TESTER_ACCOUNT.slice(0, -4)}${String(index + 1).padStart(4, "0")}`;
}

function base(scenario: SolanaReferralsTesterScenario): SolanaReferralsData {
  return {
    account: testerAccount(scenario),
    isWalletInitializing: false,
    isLoading: false,
    appliedCode: undefined,
    traderPoints: [],
    affiliate: undefined,
    topHolders: topHolders(),
    applyCode: fakeApply,
    createCode: fakeCreate,
  };
}

export function getSolanaReferralsTesterData(scenario: SolanaReferralsTesterScenario): SolanaReferralsData | undefined {
  switch (scenario) {
    case "live":
      return undefined;
    case "disconnected":
      return { ...base(scenario), account: undefined };
    case "noCode":
      return base(scenario);
    case "trader":
      return {
        ...base(scenario),
        appliedCode: "ALPHA",
        traderPoints: traderPoints({ seed: 3, chance: 0.02, minUsd: 40, maxUsd: 4_000 }),
      };
    case "affiliateNew":
      return {
        ...base(scenario),
        affiliate: affiliate({
          code: "SUNWAVE",
          rewardRatePercent: 80,
          totalReferrals: 0,
          activeReferrals: 0,
          refereeCount: 0,
          activityCount: 0,
          scale: 1,
        }),
      };
    case "affiliate":
      return {
        ...base(scenario),
        affiliate: affiliate({
          code: "SUNWAVE",
          rewardRatePercent: 95,
          totalReferrals: 14,
          activeReferrals: 5,
          refereeCount: 14,
          activityCount: 46,
          scale: 1,
        }),
      };
    case "big":
      return {
        ...base(scenario),
        appliedCode: "GTWHALE",
        traderPoints: traderPoints({ seed: 5, chance: 0.35, minUsd: 20_000, maxUsd: 2_500_000 }),
        affiliate: affiliate({
          code: "GTWHALEARMY1",
          rewardRatePercent: 100,
          totalReferrals: 12_480,
          activeReferrals: 3_215,
          refereeCount: 64,
          activityCount: 120,
          scale: 4_200,
        }),
      };
    case "loading":
      return { ...base(scenario), isLoading: true };
  }
}
