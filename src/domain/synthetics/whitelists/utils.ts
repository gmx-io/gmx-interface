import { getIsUsdgPool } from "config/usdgPools";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import type { GlvOrMarketInfo } from "domain/synthetics/markets/types";
import { getGlvOrMarketAddress } from "domain/synthetics/markets/utils";
import type { AccountWhitelists } from "sdk/utils/whitelists/types";

import type { AccountWhitelistsResult } from "./useAccountWhitelistsRequest";

export type DirectDepositAccess = "ungated" | "whitelisted" | "denied" | "loading";

export function getDirectDepositAccess(p: {
  chainId: number;
  glvOrMarket: GlvOrMarketInfo;
  whitelistsResult: AccountWhitelistsResult;
}): DirectDepositAccess {
  const { chainId, glvOrMarket, whitelistsResult } = p;
  const { accountWhitelists, error } = whitelistsResult;

  if (!accountWhitelists) {
    const isUsdgPool = getIsUsdgPool(chainId, glvOrMarket);

    if (!isUsdgPool) {
      return "ungated";
    }

    return error ? "denied" : "loading";
  }

  const whitelistedByAddress = isGlvInfo(glvOrMarket)
    ? accountWhitelists.deposit.glvs
    : accountWhitelists.deposit.markets;
  const glvOrMarketAddress = getGlvOrMarketAddress(glvOrMarket);
  const isWhitelisted = whitelistedByAddress[glvOrMarketAddress];

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
