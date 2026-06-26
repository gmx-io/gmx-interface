import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import type { MarketInfo } from "domain/synthetics/markets/types";

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
