import { plural } from "@lingui/macro";

import { USD_DECIMALS } from "config/factors";
import { MARKET_CLOSING_DATES, isDelistingMarket } from "config/static/markets";
import { TokensData, convertToUsd, getMidPrice } from "domain/synthetics/tokens";
import { formatConjunctionList, formatShortList } from "lib/i18n";
import { expandDecimals } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getTokenAddressByMarket } from "sdk/configs/markets";
import { getToken } from "sdk/configs/tokens";

import { getMarketBaseName } from "./utils";

const CLOSING_POOLS_LP_NOTICE_MIN_USD = expandDecimals(10_000, USD_DECIMALS);

export type ClosingPoolLpHolding = {
  marketAddress: string;
  name: string;
  usd: bigint;
};

export type ClosingPoolsLpNotice = {
  title: string;
  body: string;
};

export function getNotifiableClosingMarkets(chainId: number): string[] {
  return Object.keys(MARKET_CLOSING_DATES[chainId] ?? {}).filter(
    (marketAddress) => !isDelistingMarket(chainId, marketAddress)
  );
}

export function getUndismissedClosingMarkets(chainId: number, dismissedMarkets: string[]): string[] {
  return getNotifiableClosingMarkets(chainId).filter((marketAddress) => !dismissedMarkets.includes(marketAddress));
}

function getClosingMarketName(chainId: number, marketAddress: string): string {
  const indexToken = getToken(chainId, getTokenAddressByMarket(chainId, marketAddress, "index"));
  return getMarketBaseName({ indexToken, isSpotOnly: false });
}

export function getClosingPoolLpHoldings(
  chainId: number,
  marketTokensData: TokensData | undefined
): ClosingPoolLpHolding[] {
  const holdings: ClosingPoolLpHolding[] = [];

  for (const marketAddress of getNotifiableClosingMarkets(chainId)) {
    const token = getByKey(marketTokensData, marketAddress);

    if (!token?.prices) {
      continue;
    }

    const amount = (token.walletBalance ?? 0n) + (token.gmxAccountBalance ?? 0n);
    const usd = convertToUsd(amount, token.decimals, getMidPrice(token.prices));

    if (usd !== undefined && usd >= CLOSING_POOLS_LP_NOTICE_MIN_USD) {
      holdings.push({ marketAddress, name: getClosingMarketName(chainId, marketAddress), usd });
    }
  }

  return holdings.sort((a, b) => (a.usd === b.usd ? 0 : a.usd > b.usd ? -1 : 1));
}

function getClosingPoolsLpNoticeTitle(names: string[]): string {
  const markets = formatShortList(names);

  return plural(names.length, {
    one: `Trading in your ${markets} pool is moving to USDG pools`,
    other: `Trading in your ${markets} pools is moving to USDG pools`,
  });
}

function getClosingPoolsLpNoticeBody(names: string[]): string {
  const markets = formatConjunctionList(names);
  const gmPools = names.map((name) => `GM ${name} [USDG]`).join(", ");

  return plural(names.length, {
    one: `We're moving ${markets} trading to the new USDG pools, so fees in your current pool will drop. Move your liquidity to ${gmPools} or GLV [USDG] to keep earning.`,
    other: `We're moving ${markets} trading to the new USDG pools, so fees in your current pools will drop. Move your liquidity to ${gmPools} or GLV [USDG] to keep earning.`,
  });
}

export function getClosingPoolsLpNotice(
  holdings: ClosingPoolLpHolding[],
  undismissedMarkets: string[]
): ClosingPoolsLpNotice | undefined {
  if (!holdings.some((holding) => undismissedMarkets.includes(holding.marketAddress))) {
    return undefined;
  }

  const names = holdings.map((holding) => holding.name);

  return {
    title: getClosingPoolsLpNoticeTitle(names),
    body: getClosingPoolsLpNoticeBody(names),
  };
}

export function parseDismissedMarkets(value: string): string[] | undefined {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : undefined;
  } catch {
    return undefined;
  }
}
