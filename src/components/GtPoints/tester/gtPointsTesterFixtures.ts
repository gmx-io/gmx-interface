// Tester for the GT Points design review: sample states, shown only outside gmx.io. Never merged.
import {
  GT_CYCLE_SIZE,
  GT_DECIMALS,
  LP_TOKEN_DECIMALS,
  SOL_DECIMALS,
  type GtBuybackHistoryPoint,
  type GtBuybackPool,
  type GtHistoryAction,
  type GtHistoryItem,
  type GtHolder,
  type GtMintingPoint,
  type GtPointsBuybackData,
  type GtPointsData,
  type GtPointsGlobalData,
  type GtPointsStakeData,
  type GtRentAccount,
  type GtStakeHistoryItem,
  type GtStakePosition,
  type GtStakeToken,
  type GtWalletLpToken,
} from "../gtPointsTypes";

export type GtPointsTesterScenario =
  | "live"
  | "disconnected"
  | "zero"
  | "typical"
  | "big"
  | "loading"
  | "notStarted"
  | "nothingSellable";

export const GT_POINTS_TESTER_SCENARIOS: GtPointsTesterScenario[] = [
  "live",
  "disconnected",
  "zero",
  "typical",
  "big",
  "loading",
  "notStarted",
  "nothingSellable",
];

const TESTER_ACCOUNT = "TESTER-SOLANA-ACCOUNT";
// Fixed "now" so screenshots stay the same: 8 Nov 2026, 12:00 UTC.
const NOW = Date.UTC(2026, 10, 8, 12, 0, 0) / 1000;

// Decimal string → units with the given decimals, e.g. toUnits("12.5", 6) = 12_500_000n.
function toUnits(value: string, decimals: number): bigint {
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace("-", "").split(".");
  const units = BigInt(whole + fraction.padEnd(decimals, "0").slice(0, decimals));
  return negative ? -units : units;
}

const gt = (value: string) => toUnits(value, GT_DECIMALS);
const usd = (value: string) => toUnits(value, 30);
const sol = (value: string) => toUnits(value, SOL_DECIMALS);

// Small seeded random, so every reload shows the same rows.
function seeded(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

type HistoryShape = {
  count: number;
  seed: number;
  /** Max GT per reward row, by action */
  maxReward: Record<Exclude<GtHistoryAction, "gtSale">, number>;
  saleEvery: number;
  saleAmount: number;
};

function makeHistory({ count, seed, maxReward, saleEvery, saleAmount }: HistoryShape): GtHistoryItem[] {
  const random = seeded(seed);
  const rewardActions: Exclude<GtHistoryAction, "gtSale">[] = [
    "tradingReward",
    "tradingReward",
    "stakingReward",
    "referralReward",
  ];
  const items: GtHistoryItem[] = [];
  let time = NOW - 37 * 60;

  for (let index = 0; index < count; index++) {
    const isSale = saleEvery > 0 && index > 0 && index % saleEvery === 0;
    const action: GtHistoryAction = isSale ? "gtSale" : rewardActions[Math.floor(random() * rewardActions.length)];
    const amount = isSale
      ? -saleAmount * (0.5 + random())
      : Math.max(maxReward[action as Exclude<GtHistoryAction, "gtSale">] * random() ** 2, 0.0003);

    items.push({
      id: `tester-${seed}-${index}`,
      action,
      amount: gt(amount.toFixed(4)),
      timestamp: Math.round(time),
    });

    time -= 600 + random() * 60 * 60 * 20;
  }

  return items;
}

const TYPICAL_HISTORY = makeHistory({
  count: 34,
  seed: 7,
  maxReward: { tradingReward: 1.2, referralReward: 0.6, stakingReward: 0.25 },
  saleEvery: 15,
  saleAmount: 80,
});

const BIG_HISTORY = makeHistory({
  count: 240,
  seed: 11,
  maxReward: { tradingReward: 48_000, referralReward: 21_000, stakingReward: 9_500 },
  saleEvery: 9,
  saleAmount: 350_000,
});

// --- Global -------------------------------------------------------------------------------------

// Daily points: total minted grows from an early jump; the minting price steps up each 210,000 GT cycle.
function makeChart(days: number, startMinted: number, endMinted: number, priceAt: (cycle: number) => number) {
  const random = seeded(3);
  const points: GtMintingPoint[] = [];
  let minted = startMinted;
  const step = (endMinted - startMinted) / days;

  for (let day = 0; day <= days; day++) {
    if (day > 0) minted += step * (0.4 + 1.2 * random()) * (0.6 + (0.8 * day) / days);
    const total = day === days ? endMinted : Math.min(minted, endMinted);
    const cycle = Math.floor(total / 210_000);
    points.push({
      timestamp: NOW - (days - day) * 86_400,
      totalMinted: Math.round(total),
      mintingPrice: priceAt(cycle),
    });
  }

  return points;
}

const regularPrice = (cycle: number) => Number((0.01 * 1.021 ** cycle).toFixed(4));

// Base58-looking tail after "Demo": obviously a placeholder, but varied so the identicons differ.
const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function demoChars(random: () => number, length: number) {
  let out = "";
  for (let i = 0; i < length; i++) out += BASE58[Math.floor(random() * BASE58.length)];
  return out;
}

// Top holders follow a power curve; the tester wallet sits at `accountRank` with its own balance.
function makeHolders(top: number, seed: number, account?: { rank: number; balance: string }): GtHolder[] {
  const random = seeded(seed);
  const holders: GtHolder[] = [];
  let previous = Infinity;

  for (let rank = 1; rank <= 1_000; rank++) {
    const id = String(rank).padStart(4, "0");
    const isAccount = account?.rank === rank;
    const base = Math.min(top * rank ** -1.3 * (1 + 0.04 * random()), previous * 0.999);
    previous = base;

    holders.push({
      rank,
      address: isAccount ? TESTER_ACCOUNT : `Demo${demoChars(random, 36)}`,
      name: rank === 1 ? "GMX GT Vault" : undefined,
      balance: isAccount ? gt(account.balance) : gt(base.toFixed(2)),
      referralCode: rank === 1 ? undefined : random() < 0.7 ? `demo_${id}` : undefined,
    });
  }

  return holders;
}

function makeGlobal(
  totalMinted: number,
  chartStart: number,
  holders: GtHolder[],
  priceAt = regularPrice
): GtPointsGlobalData {
  const total = gt(String(totalMinted));
  const cycle = Math.floor(totalMinted / 210_000);
  return {
    cycle,
    cycleMinted: total % GT_CYCLE_SIZE,
    mintingPriceUsd: usd(priceAt(cycle).toFixed(4)),
    totalMinted: total,
    chart: makeChart(560, chartStart, totalMinted, priceAt),
    holders,
  };
}

const TYPICAL_GLOBAL = makeGlobal(60_304_067, 22_400_000, makeHolders(9_477_770, 5, { rank: 943, balance: "1284.56" }));
const PLAIN_GLOBAL = makeGlobal(60_304_067, 22_400_000, makeHolders(9_477_770, 5));
const BIG_GLOBAL = makeGlobal(
  1_284_034_067,
  402_000_000,
  makeHolders(98_765_432, 9, { rank: 2, balance: "6543210.98" }),
  (cycle) => Number((0.1 * 1.0016 ** cycle).toFixed(4))
);

// --- Buyback ------------------------------------------------------------------------------------

const realNow = () => Math.floor(Date.now() / 1000);
const SEASON_STARTED = { name: "Season 2", startsAt: NOW - 41 * 86_400 };

function pool(maxUsd: string, queuedGt: string, priceUsd: string): GtBuybackPool {
  return {
    maxBuybackUsd: usd(maxUsd),
    queuedGt: gt(queuedGt),
    estPriceUsd: usd(priceUsd),
    nextBuybackAt: realNow() + 3 * 3_600 + 46 * 60 + 12,
  };
}

function rentAccounts(count: number): GtRentAccount[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `rent-${index}`,
    label: `Sale request · ${String(28 - index * 3).padStart(2, "0")} Oct 2026`,
    sol: sol("0.0204"),
  }));
}

const cents = (value: number) => Math.round(value * 100) / 100;

// One buyback a day for the last `days` days (ending yesterday), priced from the minting chart:
// the buyback price stays under the minting price, with an occasional dip on busy days.
function makeBuybackHistory(chart: GtMintingPoint[], days: number, seed: number, scale = 1) {
  const random = seeded(seed);
  let totalAmountGt = 0;
  let totalValueUsdc = 0;

  return chart.slice(-(days + 1), -1).map((point, index): GtBuybackHistoryPoint => {
    const growth = 0.6 + (0.8 * index) / days;
    const valueUsdc = cents(100_000 * scale * growth * (0.6 + 0.8 * random()));
    const dip = random() < 0.05 ? 0.8 : 1;
    const buybackPrice = Number((point.mintingPrice * (0.9 + 0.1 * random()) * dip).toFixed(4));
    const amountGt = cents(valueUsdc / buybackPrice);
    totalAmountGt += amountGt;
    totalValueUsdc += valueUsdc;
    return {
      timestamp: point.timestamp,
      amountGt,
      valueUsdc,
      buybackPrice,
      mintingPrice: point.mintingPrice,
      totalAmountGt: cents(totalAmountGt),
      totalValueUsdc: cents(totalValueUsdc),
    };
  });
}

const BUYBACK_HISTORY = makeBuybackHistory(TYPICAL_GLOBAL.chart, 200, 17);
const BIG_BUYBACK_HISTORY = makeBuybackHistory(TYPICAL_GLOBAL.chart, 200, 17, 40);

function makeBuyback(overrides: Partial<GtPointsBuybackData>): GtPointsBuybackData {
  return {
    season: SEASON_STARTED,
    pool: pool("218.70", "56.84", "3.8471"),
    quota: undefined,
    participation: undefined,
    rentAccounts: undefined,
    history: BUYBACK_HISTORY,
    ...overrides,
  };
}

// --- Stake --------------------------------------------------------------------------------------

const lp = (value: string) => toUnits(value, LP_TOKEN_DECIMALS);
const GT_PRICE = 3.85;

const TOKENS: Record<"natgas" | "xau" | "glvCommodity" | "glvForex", GtStakeToken> = {
  natgas: { id: "gm-natgas", kind: "GM", name: "NATGAS/USD", iconSymbol: "NATGAS", poolTokens: ["USDC", "USDC"] },
  xau: { id: "gm-xau", kind: "GM", name: "XAU/USD", iconSymbol: "XAU", poolTokens: ["USDC", "USDC"] },
  glvCommodity: {
    id: "glv-commodity",
    kind: "GLV",
    name: "Commodity",
    iconSymbol: "GLV",
    poolTokens: ["USDC", "USDC"],
  },
  glvForex: { id: "glv-forex", kind: "GLV", name: "Forex", iconSymbol: "GLV", poolTokens: ["USDC", "USDC"] },
};

// APR tiers by full weeks staked: <1 → 0%, 1–4 → 10%, 5–12 → 15%, 13–24 → 25%, 25–48 → 35%, 49+ → 50%.
function aprForDay(day: number) {
  const weeks = Math.floor(day / 7);
  if (weeks < 1) return 0;
  if (weeks < 5) return 10;
  if (weeks < 13) return 15;
  if (weeks < 25) return 25;
  if (weeks < 49) return 35;
  return 50;
}

function avgAprForDays(days: number) {
  if (days === 0) return 0;
  let total = 0;
  for (let day = 0; day < days; day++) total += aprForDay(day);
  return total / days;
}

function position(
  id: string,
  token: GtStakeToken,
  valueUsd: number,
  tokenPrice: number,
  days: number,
  claimedShare: number
) {
  const avg = avgAprForDays(days);
  const earnedGt = (valueUsd * (avg / 100) * (days / 365)) / GT_PRICE;
  const item: GtStakePosition = {
    id,
    token,
    initialValueUsd: usd(valueUsd.toFixed(2)),
    amount: lp((valueUsd / tokenPrice).toFixed(5)),
    stakedAt: realNow() - days * 86_400 - 3_600,
    currentApr: aprForDay(days),
    avgApr: Number(avg.toFixed(2)),
    unclaimedGt: gt((earnedGt * (1 - claimedShare)).toFixed(4)),
  };
  return item;
}

function walletToken(token: GtStakeToken, balance: number, tokenPrice: number): GtWalletLpToken {
  return { token, balance: lp(balance.toFixed(5)), valueUsd: usd((balance * tokenPrice).toFixed(2)) };
}

function makeStake(
  positions: GtStakePosition[],
  wallet: GtWalletLpToken[],
  extraHistory: GtStakeHistoryItem[]
): GtPointsStakeData {
  const history: GtStakeHistoryItem[] = [
    ...positions.map((item) => ({
      id: `stake-${item.id}`,
      action: "stake" as const,
      token: item.token,
      amount: item.amount,
      timestamp: item.stakedAt,
    })),
    ...extraHistory,
  ].sort((a, b) => b.timestamp - a.timestamp);

  return {
    totalStakedUsd: positions.reduce((sum, item) => sum + (item.initialValueUsd * 102n) / 100n, 0n),
    unclaimedGt: positions.reduce((sum, item) => sum + item.unclaimedGt, 0n),
    positions,
    wallet,
    history,
  };
}

function pastMove(id: string, action: "stake" | "unstake", token: GtStakeToken, amount: string, daysAgo: number) {
  const item: GtStakeHistoryItem = {
    id,
    action,
    token,
    amount: lp(amount),
    timestamp: realNow() - daysAgo * 86_400,
  };
  return item;
}

// One wallet token sits in a market that is closed right now (off-hours), to show the explanation.
const closedXau = (): GtStakeToken => ({ ...TOKENS.xau, closedUntil: realNow() + 9 * 3_600 });

function typicalStake() {
  return makeStake(
    [
      position("p1", TOKENS.natgas, 1840.25, 0.9265, 0, 0),
      position("p2", TOKENS.glvCommodity, 4970.1, 1.2786, 16, 0.2),
      position("p3", TOKENS.xau, 1950, 1.4489, 16, 0),
      position("p4", TOKENS.glvForex, 5000, 1.0367, 238, 0.85),
      position("p5", TOKENS.glvForex, 5000, 1.0278, 260, 0.9),
    ],
    [
      walletToken(TOKENS.glvCommodity, 820.5, 1.2786),
      walletToken(TOKENS.natgas, 410, 0.9265),
      walletToken(TOKENS.glvForex, 1000, 1.0367),
      walletToken(closedXau(), 250, 1.4489),
    ],
    [
      pastMove("h1", "unstake", TOKENS.natgas, "2150.00000", 41),
      pastMove("h2", "stake", TOKENS.natgas, "2150.00000", 122),
    ]
  );
}

function bigStake() {
  const random = seeded(21);
  const tokens = [TOKENS.glvForex, TOKENS.glvCommodity, TOKENS.xau, TOKENS.natgas];
  const positions = Array.from({ length: 12 }, (_, index) =>
    position(
      `b${index}`,
      tokens[index % tokens.length],
      Math.round(120_000 + random() * 1_100_000),
      1 + random() * 0.5,
      Math.round(random() * 420),
      random() * 0.6
    )
  );
  return makeStake(
    positions,
    [
      walletToken(TOKENS.glvCommodity, 1_250_000, 1.2786),
      walletToken(TOKENS.natgas, 890_000, 0.9265),
      walletToken(TOKENS.glvForex, 2_400_000, 1.0367),
      walletToken(closedXau(), 640_000, 1.4489),
    ],
    Array.from({ length: 18 }, (_, index) =>
      pastMove(
        `bh${index}`,
        index % 2 ? "stake" : "unstake",
        tokens[index % tokens.length],
        "250000.00000",
        430 + index * 9
      )
    )
  );
}

// --- Scenarios ----------------------------------------------------------------------------------

const BASE = { account: TESTER_ACCOUNT, isWalletInitializing: false, isLoading: false };
const TYPICAL_MY = { balance: gt("1284.56"), unclaimedFromStaking: gt("12.3456"), history: TYPICAL_HISTORY };

export function getGtPointsTesterData(scenario: GtPointsTesterScenario): GtPointsData | undefined {
  switch (scenario) {
    case "live":
      return undefined;
    case "disconnected":
      return {
        ...BASE,
        account: undefined,
        my: undefined,
        global: PLAIN_GLOBAL,
        buyback: makeBuyback({}),
        stake: undefined,
      };
    case "zero":
      return {
        ...BASE,
        my: { balance: 0n, unclaimedFromStaking: 0n, history: [] },
        global: PLAIN_GLOBAL,
        buyback: makeBuyback({
          quota: { earned: 0n, remaining: 0n, availableToSell: 0n, hasReferralCode: false },
          participation: { queuedGt: 0n, estProceedsUsd: 0n },
          rentAccounts: [],
        }),
        stake: makeStake([], [], []),
      };
    case "typical":
      return {
        ...BASE,
        my: TYPICAL_MY,
        global: TYPICAL_GLOBAL,
        buyback: makeBuyback({
          quota: { earned: gt("1200"), remaining: gt("845.20"), availableToSell: gt("845.20"), hasReferralCode: true },
          participation: { queuedGt: gt("120"), estProceedsUsd: usd("461.65") },
          rentAccounts: rentAccounts(3),
        }),
        stake: typicalStake(),
      };
    case "big":
      return {
        ...BASE,
        my: { balance: gt("6543210.98"), unclaimedFromStaking: gt("123346.89"), history: BIG_HISTORY },
        global: BIG_GLOBAL,
        buyback: makeBuyback({
          pool: pool("1234567.89", "321987.65", "3.8342"),
          quota: {
            earned: gt("2500000"),
            remaining: gt("1234567.89"),
            availableToSell: gt("1234567.89"),
            hasReferralCode: true,
          },
          participation: { queuedGt: gt("250000"), estProceedsUsd: usd("958550") },
          rentAccounts: rentAccounts(9),
          history: BIG_BUYBACK_HISTORY,
        }),
        stake: bigStake(),
      };
    case "loading":
      return { ...BASE, isLoading: true, my: undefined, global: undefined, buyback: undefined, stake: undefined };
    case "notStarted":
      return {
        ...BASE,
        my: TYPICAL_MY,
        global: TYPICAL_GLOBAL,
        buyback: makeBuyback({
          season: { name: "Season 2", startsAt: realNow() + 22 * 86_400 + 4 * 3_600 },
          pool: undefined,
          quota: { earned: gt("300"), remaining: gt("300"), availableToSell: gt("300"), hasReferralCode: true },
          participation: { queuedGt: 0n, estProceedsUsd: 0n },
          rentAccounts: [],
          history: [],
        }),
        stake: typicalStake(),
      };
    case "nothingSellable":
      return {
        ...BASE,
        my: TYPICAL_MY,
        global: TYPICAL_GLOBAL,
        buyback: makeBuyback({
          quota: { earned: gt("1200"), remaining: 0n, availableToSell: 0n, hasReferralCode: true },
          participation: { queuedGt: 0n, estProceedsUsd: 0n },
          rentAccounts: rentAccounts(1),
        }),
        stake: typicalStake(),
      };
  }
}
