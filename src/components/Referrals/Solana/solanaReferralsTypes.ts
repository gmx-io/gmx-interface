import { t } from "@lingui/macro";

import { getReferralCodeLinkParam } from "domain/referrals/utils/referralCode";
import { SOLANA_SEARCH_PARAM } from "lib/chains/chainIdSearchParam";
import { REFERRAL_CODE_QUERY_PARAM } from "lib/legacy";
import { getRootUrl } from "lib/url";

export const SOLANA_GT_DECIMALS = 7;

/** Solana referral codes give traders a fixed, permanent discount on opening and closing fees. */
export const SOLANA_TRADER_DISCOUNT_PERCENT = 10;

// Solana referral codes: letters and numbers without 0, O, I and l (the base58 alphabet), up to 12 characters.
export const SOLANA_MAX_REFERRAL_CODE_LENGTH = 12;
const SOLANA_REFERRAL_CODE_REGEX = /^[1-9A-HJ-NP-Za-km-z]+$/;

export function getSolanaCodeError(value: string): string {
  if (!value) return "";

  const trimmedValue = value.trim();
  // Named like the EVM placeholder, so the existing translations of this message apply
  const MAX_REFERRAL_CODE_LENGTH = SOLANA_MAX_REFERRAL_CODE_LENGTH;
  if (trimmedValue.length > MAX_REFERRAL_CODE_LENGTH) {
    return t`Max ${MAX_REFERRAL_CODE_LENGTH} characters`;
  }

  if (!SOLANA_REFERRAL_CODE_REGEX.test(trimmedValue)) {
    return t`Only letters and numbers, without 0, O, I and l`;
  }
  return "";
}

// GT Points pages (from the Solana GT Points PR)
export const GT_POINTS_MY_PATH = "/gt-points/my";
export const GT_POINTS_GLOBAL_PATH = "/gt-points/global";
export const GT_POINTS_BUYBACK_PATH = "/gt-points/buyback";

export enum SolanaReferralsTab {
  Traders = "traders",
  Affiliates = "affiliates",
}

export const SOLANA_REFERRALS_TABS = [SolanaReferralsTab.Traders, SolanaReferralsTab.Affiliates];

// Opens GMX on the Solana network with the code: `chainId=solana` is the app's existing network switch
// (useChainIdSearchParam). The GT Points holders list builds the same link.
export function getSolanaReferralLink(code: string) {
  return `${getRootUrl()}/trade/?${REFERRAL_CODE_QUERY_PARAM}=${getReferralCodeLinkParam(code)}&chainId=${SOLANA_SEARCH_PARAM}`;
}

export type SolanaTraderPoint = {
  /** Start of the bucket, in seconds */
  timestamp: number;
  /** USD with USD_DECIMALS (30), like the EVM referral stats */
  volumeUsd: bigint;
  /** USD with USD_DECIMALS (30) */
  discountsUsd: bigint;
};

export type SolanaReferralActivity = {
  id: string;
  /** In seconds */
  timestamp: number;
  referee: string;
  /** GT with SOLANA_GT_DECIMALS */
  gtReward: bigint;
  /** GT with SOLANA_GT_DECIMALS */
  sellableQuota: bigint;
};

export type SolanaReferee = {
  address: string;
  /** In seconds */
  joinedAt: number;
  /** GT the affiliate earned from this referee, with SOLANA_GT_DECIMALS */
  gtEarned: bigint;
  /** Sellable quota the affiliate earned from this referee, GT with SOLANA_GT_DECIMALS */
  sellableQuotaEarned: bigint;
  /** In seconds; undefined = no trades yet */
  lastTradeAt: number | undefined;
};

export type SolanaGtHolder = {
  rank: number;
  address: string;
  /** Known accounts, e.g. the GT vault */
  name?: string;
  /** GT with SOLANA_GT_DECIMALS */
  gtBalance: bigint;
  referralCode: string | undefined;
};

export type SolanaAffiliateData = {
  code: string;
  /** Share of the referral rewards the affiliate receives (50-100%), set by their VIP tier; undefined = not known yet */
  rewardRatePercent: number | undefined;
  totalReferrals: number;
  activeReferrals: number;
  /** Every reward of the last 90 days, newest first: the page filters 7d/30d/90d and pages in the browser */
  activity: SolanaReferralActivity[];
  /** Every referee, in the order shown (paged in the browser) */
  referees: SolanaReferee[];
};

export type SolanaReferralsData = {
  account: string | undefined;
  isWalletInitializing: boolean;
  /** First load only. Keep the previous data while refetching, or the forms on the page start over.
   * There is no error state yet: a failed load must not look like "no code" (add one when wiring). */
  isLoading: boolean;
  /** Referral code the trader applied; undefined = none */
  appliedCode: string | undefined;
  /** Trader volume and discounts, one point per hour, in any order. Send the whole history:
   * Total shows all of it, and each range compares with the period before it. */
  traderPoints: SolanaTraderPoint[];
  /** The affiliate's own code and stats; undefined = no code yet */
  affiliate: SolanaAffiliateData | undefined;
  topHolders: SolanaGtHolder[];
  /** Resolves once the code is applied; rejects with an Error whose message is shown in a toast (e.g. "Code not found") */
  applyCode: (code: string) => Promise<void>;
  /** Resolves once the code exists; rejects with an Error whose message is shown in a toast (e.g. "Code already taken") */
  createCode: (code: string) => Promise<void>;
};
