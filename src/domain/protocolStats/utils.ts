import { t } from "@lingui/macro";

import { ARBITRUM, AVALANCHE, MEGAETH, getChainName } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { bigintToNumber, formatNumberHuman } from "lib/numbers";
import type {
  ProtocolStatsNetwork,
  ProtocolStatsSourceStatus,
  ProtocolStatsTimeseriesGroup,
} from "sdk/utils/stats/types";

const NETWORK_LABELS: Record<ProtocolStatsNetwork, string> = {
  arbitrum: getChainName(ARBITRUM),
  avalanche: getChainName(AVALANCHE),
  megaeth: getChainName(MEGAETH),
  solana: "Solana (GMTrade)",
};

export function getProtocolStatsNetworkLabel(network: ProtocolStatsNetwork) {
  return NETWORK_LABELS[network];
}

export function formatProtocolStatsUsd(value: string | null | undefined) {
  if (value === undefined) {
    return "...";
  }

  if (value === null) {
    return "-";
  }

  return formatProtocolStatsUsdNumber(bigintToNumber(BigInt(value), USD_DECIMALS));
}

export function formatProtocolStatsUsdNumber(value: number | null | undefined) {
  if (value === undefined) {
    return "...";
  }

  if (value === null) {
    return "-";
  }

  return formatNumberHuman(value, true, 2);
}

export function formatProtocolStatsCount(value: number | null | undefined) {
  if (value === undefined) {
    return "...";
  }

  if (value === null) {
    return "-";
  }

  return formatNumberHuman(value, false, 2);
}

export function sumProtocolStatsValues(values: (number | null | undefined)[]) {
  let total = 0;

  for (const value of values) {
    if (value === null || value === undefined) {
      return null;
    }

    total += value;
  }

  return total;
}

// USD metrics arrive as 30-decimal integer strings, counts as plain numbers
export function parseProtocolStatsTimeseriesValue(value: string | number | null) {
  if (value === null) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  return bigintToNumber(BigInt(value), USD_DECIMALS);
}

export type ProtocolStatsChartPoint = {
  day: number;
  provisional: boolean;
  values: Record<string, number | null>;
};

export function getProtocolStatsChartPoints(groups: ProtocolStatsTimeseriesGroup[]): ProtocolStatsChartPoint[] {
  const pointsByDay = new Map<number, ProtocolStatsChartPoint>();

  for (const group of groups) {
    for (const point of group.points) {
      let chartPoint = pointsByDay.get(point.day);

      if (!chartPoint) {
        chartPoint = { day: point.day, provisional: false, values: {} };
        pointsByDay.set(point.day, chartPoint);
      }

      chartPoint.provisional = chartPoint.provisional || point.provisional;
      chartPoint.values[group.key] = parseProtocolStatsTimeseriesValue(point.value);
    }
  }

  return Array.from(pointsByDay.values()).sort((a, b) => a.day - b.day);
}

function formatLag(seconds: number) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`;
  }

  return `${Math.round(seconds / 3600)}h`;
}

export function formatProtocolStatsSourceHealth(source: ProtocolStatsSourceStatus) {
  const lag = source.lagSeconds === null ? undefined : formatLag(source.lagSeconds);

  switch (source.health) {
    case "fresh":
      return lag === undefined ? t`Fresh` : t`Fresh, ${lag} behind`;
    case "stale":
      return lag === undefined ? t`Stale` : t`Stale, ${lag} behind`;
    case "missing":
      return t`Missing`;
  }
}
