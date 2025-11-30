import type { EndpointStats } from "./FallbackTracker";

export function byBanTimestamp(stats: EndpointStats<any>): number {
  const bannedTimestamp = stats.banned?.timestamp;

  if (!bannedTimestamp) {
    return -Infinity;
  }

  return bannedTimestamp;
}

export function byResponseTime(stats: EndpointStats<any>): number {
  return stats.checkResult?.stats?.responseTime ?? Infinity;
}
