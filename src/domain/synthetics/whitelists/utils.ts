import { getIsUsdgPool } from "config/usdgPools";
import type { Market } from "sdk/utils/markets/types";
import type { AccountWhitelists } from "sdk/utils/whitelists/types";

import type { AccountWhitelistsResult } from "./useAccountWhitelistsRequest";

export type DirectDepositAccess = "ungated" | "whitelisted" | "denied" | "loading";

export function getDirectDepositAccess(p: {
  chainId: number;
  market: Market;
  whitelistsResult: AccountWhitelistsResult;
}): DirectDepositAccess {
  const { accountWhitelists, error } = p.whitelistsResult;

  if (!accountWhitelists) {
    const isUsdgPool = getIsUsdgPool(p.chainId, p.market);

    if (!isUsdgPool) {
      return "ungated";
    }

    return error ? "denied" : "loading";
  }

  const isWhitelisted = accountWhitelists.deposit.markets[p.market.marketTokenAddress];

  if (isWhitelisted === undefined) {
    return "ungated";
  }

  return isWhitelisted ? "whitelisted" : "denied";
}

export function getIsDirectDepositBlocked(access: DirectDepositAccess | undefined): boolean {
  return access === "loading" || access === "denied";
}

export function getWhitelistedMarketAddresses(whitelists: AccountWhitelists | undefined): string[] {
  if (!whitelists) {
    return [];
  }

  return Object.entries(whitelists.deposit.markets)
    .filter(([, isWhitelisted]) => isWhitelisted)
    .map(([marketAddress]) => marketAddress);
}
