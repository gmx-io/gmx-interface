export const PROTOCOL_STATS_NETWORKS = ["arbitrum", "avalanche", "megaeth", "solana"] as const;

export type ProtocolStatsNetwork = (typeof PROTOCOL_STATS_NETWORKS)[number];

export type ProtocolStatsVersion = "v1" | "v2";

export type ProtocolStatsUsd = string;

export type ProtocolStatsVolume = {
  perps: ProtocolStatsUsd | null;
  swaps: ProtocolStatsUsd | null;
  total: ProtocolStatsUsd;
  lpFlows: ProtocolStatsUsd | null;
};

export type ProtocolStatsOpenInterest = {
  long: ProtocolStatsUsd;
  short: ProtocolStatsUsd;
  total: ProtocolStatsUsd;
};

export type ProtocolStatsFees = {
  trading: ProtocolStatsUsd | null;
  swap: ProtocolStatsUsd | null;
  total: ProtocolStatsUsd;
};

export type ProtocolStatsRevenue = {
  lp: ProtocolStatsUsd;
  buyback: ProtocolStatsUsd | null;
  protocol: ProtocolStatsUsd;
  treasury: ProtocolStatsUsd | null;
};

export type ProtocolStatsTvl = {
  pools: ProtocolStatsUsd;
  glv: ProtocolStatsUsd;
  store: ProtocolStatsUsd | null;
  total: ProtocolStatsUsd;
};

export type ProtocolStatsUsers = {
  traders: number | null;
  lps: number | null;
  all: number | null;
  distinctness: "network";
};

export type ProtocolStatsTrades = {
  perps: number | null;
  swaps: number | null;
  total: number | null;
};

export type ProtocolStatsMetricSet = {
  volume: ProtocolStatsVolume;
  volume24h: ProtocolStatsVolume | null;
  openInterest: ProtocolStatsOpenInterest | null;
  fees: ProtocolStatsFees;
  fees24h: ProtocolStatsFees | null;
  revenue: ProtocolStatsRevenue | null;
  tvl: ProtocolStatsTvl | null;
  users: ProtocolStatsUsers;
  trades: ProtocolStatsTrades;
};

export type ProtocolStatsSourceHealth = "fresh" | "stale" | "missing";

export type ProtocolStatsSourceStatus = {
  id: string;
  network: ProtocolStatsNetwork;
  version: ProtocolStatsVersion;
  asOf: number | null;
  fetchedAt: number | null;
  health: ProtocolStatsSourceHealth;
  lagSeconds: number | null;
  lastError: string | null;
};

export type ProtocolStatsCompleteness = "complete" | "partial";

export type ProtocolStatsMeta = {
  asOf: number;
  completeness: ProtocolStatsCompleteness;
  sources: ProtocolStatsSourceStatus[];
  schemaVersion: string;
};

export type ProtocolStatsFilterParams = {
  networks?: ProtocolStatsNetwork[];
  versions?: ProtocolStatsVersion[];
};

export type ProtocolStatsSummaryResponse = {
  meta: ProtocolStatsMeta;
  totals: ProtocolStatsMetricSet;
  byNetwork: Partial<Record<ProtocolStatsNetwork, ProtocolStatsMetricSet>>;
  byVersion: Partial<Record<ProtocolStatsVersion, ProtocolStatsMetricSet>>;
};

export type ProtocolStatsTimeseriesMetric =
  | "volume.perps"
  | "volume.swaps"
  | "volume.total"
  | "fees.trading"
  | "fees.swap"
  | "fees.total"
  | "revenue.protocol"
  | "revenue.lp"
  | "trades.perps"
  | "trades.swaps"
  | "users.active";

export type ProtocolStatsTimeseriesGroupBy = "network" | "version" | "none";

export type ProtocolStatsTimeseriesParams = ProtocolStatsFilterParams & {
  metric: ProtocolStatsTimeseriesMetric;
  groupBy?: ProtocolStatsTimeseriesGroupBy;
  from?: number;
  to?: number;
};

export type ProtocolStatsTimeseriesPoint = {
  day: number;
  value: string | number | null;
  provisional: boolean;
};

export type ProtocolStatsTimeseriesGroup = {
  key: string;
  points: ProtocolStatsTimeseriesPoint[];
};

export type ProtocolStatsTimeseriesResponse = {
  meta: ProtocolStatsMeta;
  metric: ProtocolStatsTimeseriesMetric;
  interval: "1d";
  groupBy: ProtocolStatsTimeseriesGroupBy;
  groups: ProtocolStatsTimeseriesGroup[];
};
