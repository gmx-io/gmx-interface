import { isNotZero, safeDivide } from "lib/numbers";

import type { EndpointStats } from "./FallbackTracker";

export function scoreNotBanned(stats: EndpointStats<any>): number {
  const bannedTimestamp = stats.banned?.timestamp;

  if (!bannedTimestamp) {
    return Infinity;
  }

  return -bannedTimestamp;
}

export function getAvgResponseTime(stats: EndpointStats<{ responseTime: number }>[]): number {
  let totalTime = 0;
  let totalChecks = 0;

  // Single-pass iteration: count checks and sum response times simultaneously
  for (const stat of stats) {
    for (const checkResult of stat.checkResults) {
      if (checkResult.success && checkResult.stats?.responseTime) {
        totalTime += checkResult.stats.responseTime;
        totalChecks++;
      }
    }
  }

  if (!isNotZero(totalChecks)) {
    return 0;
  }

  return safeDivide(totalTime, totalChecks);
}

export function scoreBySpeedAndConsistency(avgResponseTime: number) {
  const STABILITY_WEIGHT = 0.7;
  const SPEED_WEIGHT = 0.5;

  return function calculateScore(stats: EndpointStats<{ responseTime: number }>): number {
    const totalChecks = stats.checkResults.length;

    const isScoreAvailable = isNotZero(avgResponseTime) && isNotZero(totalChecks);

    if (!isScoreAvailable) {
      return 0;
    }

    let successfulCount = 0;
    let endpointTimeSum = 0;

    for (const checkResult of stats.checkResults) {
      if (checkResult.success) {
        successfulCount++;
        endpointTimeSum += checkResult.stats?.responseTime ?? 0;
      }
    }

    // Success rate - normalized to [0, 1]
    const stabilityScore = successfulCount / totalChecks;

    // Calculate average response time for successful checks only
    const endpointAvgTime = isNotZero(successfulCount) ? safeDivide(endpointTimeSum, successfulCount) : 0;

    // Exponential decay for speed score - normalized to [0, 1]
    // Fast responses (low time) → high score, slow responses (high time) → low score
    // Use pre-calculated avgResponseTime (from all samples) as normalization factor
    const avgSpeedScore = Math.exp(safeDivide(-endpointAvgTime, avgResponseTime));

    const combinedScore = STABILITY_WEIGHT * stabilityScore + SPEED_WEIGHT * avgSpeedScore;

    return combinedScore;
  };
}
