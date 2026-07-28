import type { LeaderboardAccount } from "domain/synthetics/leaderboard";
import { formatAmount, USD_DECIMALS } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

export function formatDelta(
  delta: bigint,
  {
    decimals = USD_DECIMALS,
    displayDecimals = 2,
    useCommas = true,
    ...p
  }: {
    decimals?: number;
    displayDecimals?: number;
    useCommas?: boolean;
    prefixoid?: string;
    signed?: boolean;
    prefix?: string;
    postfix?: string;
  } = {}
) {
  return `${p.prefixoid ? `${p.prefixoid}\u200a` : ""}${p.signed ? (delta === 0n ? "" : delta > 0 ? "+" : "-") : ""}${
    p.prefix || ""
  }\u200a${formatAmount(p.signed ? bigMath.abs(delta) : delta, decimals, displayDecimals, useCommas)}${p.postfix || ""}`;
}

export function getSignedValueClassName(num: bigint) {
  return num === 0n ? "" : num < 0 ? "negative" : "positive";
}

type LeaderboardRealizedPnlAccount = Pick<
  LeaderboardAccount,
  | "realizedPnl"
  | "realizedFees"
  | "realizedSwapFees"
  | "realizedPriceImpact"
  | "realizedSwapImpact"
  | "positiveFundingFeesUsd"
>;

export function getLeaderboardRealizedPnl(account: LeaderboardRealizedPnlAccount, isPnlAfterFees: boolean | undefined) {
  if (!isPnlAfterFees) return account.realizedPnl;

  return (
    account.realizedPnl -
    account.realizedFees -
    account.realizedSwapFees +
    account.realizedPriceImpact +
    account.realizedSwapImpact +
    account.positiveFundingFeesUsd
  );
}

export function compareLeaderboardValues(a: bigint | number, b: bigint | number, direction: "asc" | "desc"): number {
  let comparison = 0;

  if (typeof a === "bigint" && typeof b === "bigint") {
    comparison = a > b ? -1 : a < b ? 1 : 0;
  } else if (typeof a === "number" && typeof b === "number") {
    comparison = a > b ? -1 : a < b ? 1 : 0;
  }

  if (comparison === 0) return 0;

  return direction === "asc" ? comparison * -1 : comparison;
}
