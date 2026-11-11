export const GT_DECIMALS = 7;

export const GT_POINTS_PATH = "/gt-points";
export const GT_POINTS_MY_PATH = "/gt-points/my";
export const GT_POINTS_GLOBAL_PATH = "/gt-points/global";
export const GT_POINTS_BUYBACK_PATH = "/gt-points/buyback";
export const GT_POINTS_STAKE_PATH = "/gt-points/stake";

export type VipTier = {
  level: number;
  /** GT needed to reach the tier */
  minGt: bigint;
  /** VIP trading fee discount, in percent, without the referral discount */
  feeDiscount: number;
  /** Share of referral rewards, in percent */
  referralRewards: number;
};

const gtUnits = (value: number) => BigInt(value) * 10n ** BigInt(GT_DECIMALS);

/** Smallest GT amount one sale can submit: 0.01 GT. A frontend rule, as in the reference product. */
export const MIN_SELL_GT = 10n ** BigInt(GT_DECIMALS - 2);

/** Extra trading fee discount for traders with an active referral code, in percent.
 * The reference product reads it from the on-chain Store configuration; 10% is the fallback. */
export const REFERRAL_FEE_DISCOUNT = 10;

export const VIP_TIERS: VipTier[] = [
  { level: 0, minGt: gtUnits(0), feeDiscount: 0, referralRewards: 50 },
  { level: 1, minGt: gtUnits(600), feeDiscount: 2, referralRewards: 60 },
  { level: 2, minGt: gtUnits(2_000), feeDiscount: 3, referralRewards: 65 },
  { level: 3, minGt: gtUnits(6_000), feeDiscount: 4, referralRewards: 70 },
  { level: 4, minGt: gtUnits(20_000), feeDiscount: 5, referralRewards: 75 },
  { level: 5, minGt: gtUnits(60_000), feeDiscount: 6, referralRewards: 80 },
  { level: 6, minGt: gtUnits(200_000), feeDiscount: 7, referralRewards: 85 },
  { level: 7, minGt: gtUnits(600_000), feeDiscount: 8, referralRewards: 90 },
  { level: 8, minGt: gtUnits(2_000_000), feeDiscount: 9, referralRewards: 95 },
  { level: 9, minGt: gtUnits(6_000_000), feeDiscount: 10, referralRewards: 100 },
];

export type GtHistoryAction = "tradingReward" | "referralReward" | "stakingReward" | "gtSale";

export const GT_HISTORY_ACTIONS: GtHistoryAction[] = ["tradingReward", "referralReward", "stakingReward", "gtSale"];

export type GtHistoryItem = {
  id: string;
  action: GtHistoryAction;
  /** Signed: rewards are positive, GT sold in a buyback is negative */
  amount: bigint;
  /** Unix seconds */
  timestamp: number;
};

export type GtPointsMyData = {
  /** GT in the wallet */
  balance: bigint;
  /** GT earned from staking GLV/GM that is not claimed yet */
  unclaimedFromStaking: bigint;
  history: GtHistoryItem[];
};

export const GT_CYCLE_SIZE = 210_000n * 10n ** BigInt(GT_DECIMALS);
export const SOL_DECIMALS = 9;

export type GtMintingPoint = {
  /** Unix seconds */
  timestamp: number;
  /** All GT minted so far */
  totalMinted: number;
  /** Minting price, $/GT */
  mintingPrice: number;
};

export type GtHolder = {
  /** Unique, starting at 1 */
  rank: number;
  address: string;
  /** Known accounts, e.g. the GT vault */
  name?: string;
  balance: bigint;
  referralCode?: string;
};

export type GtPointsGlobalData = {
  cycle: number;
  /** GT minted in the current cycle */
  cycleMinted: bigint;
  /** Current minting price, USD with 30 decimals */
  mintingPriceUsd: bigint;
  totalMinted: bigint;
  chart: GtMintingPoint[];
  /** Top 1,000 holders */
  holders: GtHolder[];
};

export type GtBuybackSeason = {
  /** e.g. "Season 2" */
  name: string;
  /** Unix seconds */
  startsAt: number;
};

export type GtBuybackPool = {
  /** USDC the next buyback can spend, USD with 30 decimals */
  maxBuybackUsd: bigint;
  /** GT submitted for sale in the next buyback */
  queuedGt: bigint;
  /** Estimated price, USD with 30 decimals */
  estPriceUsd: bigint;
  /** Unix seconds */
  nextBuybackAt: number;
};

export type GtSellableQuota = {
  /** Quota earned this season */
  earned: bigint;
  /** Earned quota not used yet */
  remaining: bigint;
  /** What can be sold right now: the remaining quota, capped by the GT balance */
  availableToSell: bigint;
  hasReferralCode: boolean;
};

export type GtRentAccount = {
  id: string;
  /** e.g. "Sale request · 28 Oct 2026" */
  label: string;
  /** Reclaimable SOL, 9 decimals */
  sol: bigint;
};

/**
 * One completed buyback, as a chart point. Buybacks run once a day: one point per UTC day, oldest first.
 * Plain numbers for the chart: whole GT, whole USDC and USD per GT (not bigints with decimals).
 */
export type GtBuybackHistoryPoint = {
  /** Unix seconds of the buyback run */
  timestamp: number;
  /** GT bought back; 0 on a day when nobody sold */
  amountGt: number;
  /** USDC spent; 0 on a day when nobody sold */
  valueUsdc: number;
  /** USDC paid per GT; null on a day when nobody sold (the price line has a gap there) */
  buybackPrice: number | null;
  /** Minting price at the time of the buyback, USD per GT: the cap for the buyback price */
  mintingPrice: number;
  /** GT bought back by all buybacks so far, this one included */
  totalAmountGt: number;
  /** USDC spent by all buybacks so far, this one included */
  totalValueUsdc: number;
};

export type GtPointsBuybackData = {
  season: GtBuybackSeason;
  /** Undefined before the season starts */
  pool: GtBuybackPool | undefined;
  /** Personal values, undefined without a wallet */
  quota: GtSellableQuota | undefined;
  participation: { queuedGt: bigint; estProceedsUsd: bigint } | undefined;
  rentAccounts: GtRentAccount[] | undefined;
  /** Completed buybacks, oldest first; empty before the first one */
  history: GtBuybackHistoryPoint[] | undefined;
};

export const LP_TOKEN_DECIMALS = 18;

/** Smallest stake per token: $1.00 worth (USD with 30 decimals).
 * The reference product reads it from the on-chain Stake global state. */
export const MIN_STAKE_USD = 10n ** 30n;

export type GtStakeToken = {
  id: string;
  kind: "GM" | "GLV";
  /** e.g. "NATGAS/USD" for GM, "Commodity" for GLV */
  name: string;
  /** Icon symbol, e.g. "NATGAS" or "GLV" */
  iconSymbol: string;
  /** Pool tokens, e.g. ["USDC", "USDC"] */
  poolTokens: [string, string];
  /** Set while the market is closed (off-hours): staking opens again at this time */
  closedUntil?: number;
};

export type GtStakePosition = {
  id: string;
  token: GtStakeToken;
  /** USD with 30 decimals */
  initialValueUsd: bigint;
  /** GM/GLV amount, 18 decimals */
  amount: bigint;
  /** Unix seconds */
  stakedAt: number;
  /** In percent */
  currentApr: number;
  avgApr: number;
  unclaimedGt: bigint;
};

export type GtWalletLpToken = {
  token: GtStakeToken;
  balance: bigint;
  /** USD with 30 decimals, priced the way the staking program prices the token.
   * The $1 minimum stake is worked out from it; without a price the token can't be staked. */
  valueUsd: bigint;
};

export type GtStakeHistoryItem = {
  id: string;
  action: "stake" | "unstake";
  token: GtStakeToken;
  amount: bigint;
  timestamp: number;
};

export type GtPointsStakeData = {
  totalStakedUsd: bigint;
  unclaimedGt: bigint;
  positions: GtStakePosition[];
  /** GLV/GM in the wallet that can be staked: tokens with a balance only */
  wallet: GtWalletLpToken[];
  history: GtStakeHistoryItem[];
};

export type GtPointsData = {
  account: string | undefined;
  isWalletInitializing: boolean;
  isLoading: boolean;
  my: GtPointsMyData | undefined;
  global: GtPointsGlobalData | undefined;
  buyback: GtPointsBuybackData | undefined;
  stake: GtPointsStakeData | undefined;
};
