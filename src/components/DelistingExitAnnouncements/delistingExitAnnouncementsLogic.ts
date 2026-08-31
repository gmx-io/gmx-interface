import { i18n } from "@lingui/core";
import { plural, t } from "@lingui/macro";

import { DELISTING_ANNOUNCEMENT_DISMISSED_KEY_PREFIX } from "config/localStorage";
import { isDelistingMarket } from "config/static/markets";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import type { MarketInfo, MarketsInfoData } from "domain/synthetics/markets/types";
import type { PositionsData } from "domain/synthetics/positions";
import type { TokensData } from "domain/synthetics/tokens";
import { DAY_MS } from "lib/dates";
import { getByKey } from "lib/objects";

export function getDelistingMarketLabel(marketInfo: MarketInfo): string {
  if (marketInfo.isSpotOnly) {
    return getMarketPoolName(marketInfo);
  }
  return getMarketIndexName(marketInfo);
}

export function joinMarketNames(names: string[]): string {
  // Locale-aware conjunction ("A, B and C" in en, "A, B и C" in ru, etc.) instead of a hardcoded English "and".
  return new Intl.ListFormat(i18n.locale || "en", { style: "long", type: "conjunction" }).format(names);
}

export function buildPositionsBodyText(marketNames: string[], positionCount: number): string {
  const markets = joinMarketNames(marketNames);
  const verb = plural(marketNames.length, { one: "is", other: "are" });
  const positionNoun = plural(positionCount, { one: "position", other: "positions" });
  return t`${markets} ${verb} being delisted. Close your existing ${positionNoun} as remaining positions may be auto-closed.`;
}

export function buildLiquidityBodyText(poolNames: string[]): string {
  const pools = joinMarketNames(poolNames);
  const verb = plural(poolNames.length, { one: "is", other: "are" });
  return t`${pools} ${verb} being delisted. Withdraw your liquidity as deposits are no longer available, or move it into GLV to keep earning.`;
}

// A market disabled onchain can no longer be traded out of or withdrawn from, so it must drop out of the
// announcement on its own, with no list edit. `isDisabled` carries the onchain IS_MARKET_DISABLED flag on
// every data path. A missing entry fails closed: still loading, or dropped from the merge and unnameable.
export function isMarketOpenOnchain(marketsInfoData: MarketsInfoData | undefined, marketAddress: string): boolean {
  const marketInfo = getByKey(marketsInfoData, marketAddress);
  return marketInfo !== undefined && !marketInfo.isDisabled;
}

export function computeAffectedPositionMarkets(
  chainId: number,
  positionsInfoData: PositionsData | undefined,
  marketsInfoData: MarketsInfoData | undefined
): { marketAddresses: string[]; positionCount: number } {
  const marketAddresses = new Set<string>();
  let positionCount = 0;

  for (const position of Object.values(positionsInfoData ?? {})) {
    if (
      isDelistingMarket(chainId, position.marketAddress) &&
      isMarketOpenOnchain(marketsInfoData, position.marketAddress)
    ) {
      marketAddresses.add(position.marketAddress);
      positionCount += 1;
    }
  }

  return { marketAddresses: Array.from(marketAddresses), positionCount };
}

export function computeAffectedLiquidityMarkets(
  chainId: number,
  depositMarketTokensData: TokensData | undefined,
  marketsInfoData: MarketsInfoData | undefined
): string[] {
  const result: string[] = [];

  for (const [address, token] of Object.entries(depositMarketTokensData ?? {})) {
    if (
      (token.balance ?? 0n) > 0n &&
      isDelistingMarket(chainId, address) &&
      isMarketOpenOnchain(marketsInfoData, address)
    ) {
      result.push(address);
    }
  }

  return result;
}

export type DelistingExposure = {
  positionMarkets: string[];
  positionNames: string[];
  positionCount: number;
  liquidityMarkets: string[];
  liquidityNames: string[];
};

export function getDelistingExposure(params: {
  chainId: number;
  positionsInfoData: PositionsData | undefined;
  depositMarketTokensData: TokensData | undefined;
  marketsInfoData: MarketsInfoData | undefined;
}): DelistingExposure {
  const { chainId, positionsInfoData, depositMarketTokensData, marketsInfoData } = params;

  const labelOf = (addresses: string[]): string[] =>
    addresses
      .map((address) => getByKey(marketsInfoData, address))
      .filter((marketInfo): marketInfo is MarketInfo => Boolean(marketInfo))
      .map(getDelistingMarketLabel);

  const { marketAddresses: positionMarkets, positionCount } = computeAffectedPositionMarkets(
    chainId,
    positionsInfoData,
    marketsInfoData
  );
  const liquidityMarkets = computeAffectedLiquidityMarkets(chainId, depositMarketTokensData, marketsInfoData);

  return {
    positionMarkets,
    positionNames: labelOf(positionMarkets),
    positionCount,
    liquidityMarkets,
    liquidityNames: labelOf(liquidityMarkets),
  };
}

export const DELISTING_ANNOUNCEMENT_COOLDOWN_MS = DAY_MS;

export type DelistingDismissal = { dismissedAt: number; markets: string[] };

function getDismissalKey(toastId: string): string {
  return `${DELISTING_ANNOUNCEMENT_DISMISSED_KEY_PREFIX}-${toastId}`;
}

export function readDismissal(toastId: string): DelistingDismissal | undefined {
  const raw = localStorage.getItem(getDismissalKey(toastId));
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.dismissedAt !== "number" || !Array.isArray(parsed?.markets)) {
      return undefined;
    }
    return parsed as DelistingDismissal;
  } catch {
    return undefined;
  }
}

export function writeDismissal(toastId: string, marketAddresses: string[], dismissedAt: number): void {
  const value: DelistingDismissal = { dismissedAt, markets: [...marketAddresses].sort() };
  localStorage.setItem(getDismissalKey(toastId), JSON.stringify(value));
}

export function shouldShowDelistingAnnouncement(toastId: string, affectedAddresses: string[], now: number): boolean {
  const record = readDismissal(toastId);
  if (!record) {
    return true;
  }
  if (now - record.dismissedAt >= DELISTING_ANNOUNCEMENT_COOLDOWN_MS) {
    return true;
  }
  return affectedAddresses.some((address) => !record.markets.includes(address));
}

export const POSITIONS_TOAST_ID = "delisting-positions";
export const LIQUIDITY_TOAST_ID = "delisting-liquidity";

export type DelistingToast = {
  id: string;
  title: string;
  bodyText: string;
  markets: string[];
  link?: { text: string; href: string };
};

export function getActiveDelistingAnnouncementsForExposure(
  params: DelistingExposure & {
    now: number;
  }
): DelistingToast[] {
  const { positionMarkets, positionNames, positionCount, liquidityMarkets, liquidityNames, now } = params;

  const toShow: DelistingToast[] = [];
  const title = t`Market delistings`;

  if (positionNames.length > 0 && shouldShowDelistingAnnouncement(POSITIONS_TOAST_ID, positionMarkets, now)) {
    toShow.push({
      id: POSITIONS_TOAST_ID,
      title,
      bodyText: buildPositionsBodyText(positionNames, positionCount),
      markets: positionMarkets,
      link: { text: t`Close positions`, href: "/trade" },
    });
  }

  if (liquidityNames.length > 0 && shouldShowDelistingAnnouncement(LIQUIDITY_TOAST_ID, liquidityMarkets, now)) {
    toShow.push({
      id: LIQUIDITY_TOAST_ID,
      title,
      bodyText: buildLiquidityBodyText(liquidityNames),
      markets: liquidityMarkets,
      link: { text: t`Manage liquidity`, href: "/pools" },
    });
  }

  return toShow;
}

export function getActiveDelistingAnnouncements(params: {
  chainId: number;
  positionsInfoData: PositionsData | undefined;
  depositMarketTokensData: TokensData | undefined;
  marketsInfoData: MarketsInfoData | undefined;
  now: number;
}): DelistingToast[] {
  const { now, ...exposureParams } = params;
  return getActiveDelistingAnnouncementsForExposure({
    ...getDelistingExposure(exposureParams),
    now,
  });
}
