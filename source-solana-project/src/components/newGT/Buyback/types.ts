/**
 * Keeper buyback StringNumber conventions:
 * - GT amounts: on-chain raw integers (divide by store GT decimals for UI).
 * - USDC amounts (`*UsdcAmount`): raw with payout-token decimals (typically 6).
 * - Prices: payout token raw amount per raw GT.
 */
export type GtBuybackParticipation = {
  userParticipatingGt: string;
  userQueuedGt: string;
  userBurnSubmittedGt: string;
  userBurnConfirmedGt: string;
  userPayoutSubmittedGt: string;
  userSettledGt: string;
  userFailedGt: string;
  userEstimatedSellProceedsUsdcAmount: string;
  storedEstimatedPayoutUsdcAmount: string;
  finalPayoutUsdcAmount: string;
};

export type GtBuybackSummary = {
  store: string;
  owner: string;
  marketPeriodIndex: string;
  periodStartTimestamp: string;
  periodEndTimestamp: string;
  nextBuybackTimestamp: string;
  currentMintingPrice: string;
  maxBuybackValueUsdcAmount: string;
  maxBuybackValueUpdatedAt: string | null;
  nextMaxBuybackValueRefreshAt: string;
  globalQueuedGt: string;
  userQuotaExists: boolean;
  userTotalQuotaGt: string;
  userConfirmedSoldGt: string;
  userQueuedGt: string;
  userRemainingGt: string;
  requestedGtAmount: string | null;
  quotedGtAmount: string;
  estimatedBuybackPrice: string;
  estimatedSellProceedsUsdcAmount: string;
  myBuybackParticipation: GtBuybackParticipation;
};

export type GtBuybackBurnSubmitResult = {
  accepted: boolean;
  owner: string;
  store: string;
  vault: string;
  exchange: string;
  amount: string;
  currentMintingPrice: string;
  estimatedPayoutUsdcAmount: string;
  priceTimestamp: string;
  expiresAt: string;
  signature: string | null;
  slot: string | null;
  sendError: string | null;
};

/** Minimal fields for post-submit status polling. */
export type GtBuybackRequestStatusResult = {
  signature: string;
  status: string;
  failureReason: string | null;
};

/** Derived view for Today's Buyback Pool section (UI numbers). */
export type TodaysBuybackPoolView = {
  maxBuybackValue: number;
  queuedGtForSell: number;
  estBuybackPrice: number;
  currentMintingPrice: number;
  nextBuybackTimestamp: string;
};

export type MyBuybackParticipationView = {
  queuedGtForSell: number;
  estSellProceeds: number;
  /** Final payout for requests that have entered payout / settled. */
  finalPayoutUsdc: number;
};

export type BuybackPoolStatus = 'Strong' | 'Moderate' | 'Under Pressure';
