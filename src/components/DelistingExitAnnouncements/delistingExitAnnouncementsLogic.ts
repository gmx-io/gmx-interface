import { DELISTING_ANNOUNCEMENT_DISMISSED_KEY_PREFIX } from "config/localStorage";
import { isDelistingMarket } from "config/static/markets";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import type { MarketInfo, MarketsInfoData } from "domain/synthetics/markets/types";
import type { PositionsInfoData } from "domain/synthetics/positions";
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
  if (names.length === 0) {
    return "";
  }
  if (names.length === 1) {
    return names[0];
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function buildPositionsBodyText(marketNames: string[], positionCount: number): string {
  const verb = marketNames.length === 1 ? "is" : "are";
  const positionNoun = positionCount === 1 ? "position" : "positions";
  return `${joinMarketNames(marketNames)} ${verb} being delisted. Close your existing ${positionNoun} as remaining positions may be auto-closed.`;
}

export function buildLiquidityBodyText(poolNames: string[]): string {
  const verb = poolNames.length === 1 ? "is" : "are";
  return `${joinMarketNames(poolNames)} ${verb} being delisted. Withdraw your liquidity as deposits are no longer available, or move it into GLV to keep earning.`;
}

export function computeAffectedPositionMarkets(
  chainId: number,
  positionsInfoData: PositionsInfoData | undefined
): { marketAddresses: string[]; positionCount: number } {
  const marketAddresses = new Set<string>();
  let positionCount = 0;

  for (const position of Object.values(positionsInfoData ?? {})) {
    if (isDelistingMarket(chainId, position.marketAddress)) {
      marketAddresses.add(position.marketAddress);
      positionCount += 1;
    }
  }

  return { marketAddresses: Array.from(marketAddresses), positionCount };
}

export function computeAffectedLiquidityMarkets(
  chainId: number,
  depositMarketTokensData: TokensData | undefined
): string[] {
  const result: string[] = [];

  for (const [address, token] of Object.entries(depositMarketTokensData ?? {})) {
    if ((token.balance ?? 0n) > 0n && isDelistingMarket(chainId, address)) {
      result.push(address);
    }
  }

  return result;
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
export const DELISTING_ANNOUNCEMENT_TITLE = "Market delistings";

export type DelistingToast = {
  id: string;
  title: string;
  bodyText: string;
  markets: string[];
  link?: { text: string; href: string };
};

export function getDelistingAnnouncementActions(params: {
  chainId: number;
  positionsInfoData: PositionsInfoData | undefined;
  depositMarketTokensData: TokensData | undefined;
  marketsInfoData: MarketsInfoData | undefined;
  now: number;
}): { toShow: DelistingToast[]; toDismiss: string[] } {
  const { chainId, positionsInfoData, depositMarketTokensData, marketsInfoData, now } = params;

  const toShow: DelistingToast[] = [];
  const toDismiss: string[] = [];

  const labelOf = (addresses: string[]): string[] =>
    addresses
      .map((address) => getByKey(marketsInfoData, address))
      .filter((marketInfo): marketInfo is MarketInfo => Boolean(marketInfo))
      .map(getDelistingMarketLabel);

  // Positions
  const { marketAddresses: positionMarkets, positionCount } = computeAffectedPositionMarkets(
    chainId,
    positionsInfoData
  );
  if (positionMarkets.length === 0) {
    toDismiss.push(POSITIONS_TOAST_ID);
  } else {
    const names = labelOf(positionMarkets);
    if (names.length > 0 && shouldShowDelistingAnnouncement(POSITIONS_TOAST_ID, positionMarkets, now)) {
      toShow.push({
        id: POSITIONS_TOAST_ID,
        title: DELISTING_ANNOUNCEMENT_TITLE,
        bodyText: buildPositionsBodyText(names, positionCount),
        markets: positionMarkets,
      });
    }
  }

  // Liquidity
  const liquidityMarkets = computeAffectedLiquidityMarkets(chainId, depositMarketTokensData);
  if (liquidityMarkets.length === 0) {
    toDismiss.push(LIQUIDITY_TOAST_ID);
  } else {
    const names = labelOf(liquidityMarkets);
    if (names.length > 0 && shouldShowDelistingAnnouncement(LIQUIDITY_TOAST_ID, liquidityMarkets, now)) {
      toShow.push({
        id: LIQUIDITY_TOAST_ID,
        title: DELISTING_ANNOUNCEMENT_TITLE,
        bodyText: buildLiquidityBodyText(names),
        markets: liquidityMarkets,
        link: { text: "Manage liquidity", href: "/pools" },
      });
    }
  }

  return { toShow, toDismiss };
}
