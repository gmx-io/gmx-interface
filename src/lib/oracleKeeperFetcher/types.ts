import type { Address } from "viem";

import { UserFeedback } from "domain/synthetics/userFeedback";
import { FromNewToOldArray, Bar } from "domain/tradingview/types";

export type EventPayload = {
  isError: boolean;
  version: string;
  event: string;
  message?: string;
  host: string;
  url?: string;
  time?: number;
  isDev?: boolean;
  customFields?: any;
  isMissedGlobalMetricData?: boolean;
};

export type CounterPayload = {
  event: string;
  version: string;
  isDev: boolean;
  host: string;
  url: string;
  abFlags: { [key: string]: boolean };
  customFields?: { [key: string]: any };
};

export type TimingPayload = {
  event: string;
  version: string;
  time: number;
  isDev: boolean;
  host: string;
  url: string;
  abFlags: { [key: string]: boolean };
  customFields?: { [key: string]: any };
};

export type UserAnalyticsEventPayload = {
  event: string;
  distinctId: string;
  customFields: { [key: string]: any };
};

export type UserAnalyticsProfilePayload = {
  distinctId: string;
  customFields: { [key: string]: any };
};

export type UserAnalyticsEventItem = {
  type: "userAnalyticsEvent";
  payload: UserAnalyticsEventPayload;
};

export type UserAnalyticsProfileItem = {
  type: "userAnalyticsProfile";
  payload: UserAnalyticsProfilePayload;
};

export type EventItem = {
  type: "event";
  payload: EventPayload;
};

export type CounterItem = {
  type: "counter";
  payload: CounterPayload;
};

export type TimingItem = {
  type: "timing";
  payload: TimingPayload;
};

export type BatchReportItem = UserAnalyticsEventItem | UserAnalyticsProfileItem | EventItem | CounterItem | TimingItem;

export type BatchReportBody = {
  items: BatchReportItem[];
};

export type ApyInfo = {
  markets: { address: string; baseApy: number; bonusApy: number; apy: number }[];
  glvs: { address: string; baseApy: number; bonusApy: number; apy: number }[];
};

export type PerformanceInfo = {
  address: string;
  entity: string;
  longTokenPerformance: string;
  shortTokenPerformance: string;
  uniswapV2Performance: string;
};

export type ApyPeriod = "1d" | "7d" | "30d" | "90d" | "180d" | "total";

export type PerformancePeriod = "1d" | "7d" | "30d" | "90d" | "180d" | "total";

export type PerformanceAnnualizedResponse = {
  address: string;
  entity: "Market" | "Glv";
  longTokenPerformance: string;
  shortTokenPerformance: string;
  uniswapV2Performance: string;
}[];

export type PerformanceSnapshotsResponse = {
  address: string;
  entity: "Market" | "Glv";
  snapshots: {
    snapshotTimestamp: string;
    uniswapV2Performance: string;
  }[];
}[];

export interface OracleFetcher {
  readonly url: string;
  fetchTickers(): Promise<TickersResponse>;
  fetch24hPrices(): Promise<DayPriceCandle[]>;
  fetchOracleCandles(tokenSymbol: string, period: string, limit: number): Promise<FromNewToOldArray<Bar>>;
  fetchIncentivesRewards(): Promise<RawIncentivesStats | null>;
  fetchPostBatchReport(body: BatchReportBody, debug?: boolean): Promise<Response>;
  fetchPostFeedback(body: UserFeedbackBody, debug?: boolean): Promise<Response>;
  fetchUiVersion(currentVersion: number, active: boolean): Promise<number>;
  fetchApys(period: ApyPeriod, debug?: boolean): Promise<ApyInfo>;
  fetchPerformanceAnnualized(period: PerformancePeriod, address?: string): Promise<PerformanceAnnualizedResponse>;
  fetchPerformanceSnapshots(period: PerformancePeriod, address?: string): Promise<PerformanceSnapshotsResponse>;
}

export type TickersResponse = {
  minPrice: string;
  maxPrice: string;
  oracleDecimals: number;
  tokenSymbol: string;
  tokenAddress: string;
  updatedAt: number;
}[];

export type DayPriceCandle = {
  tokenSymbol: string;
  high: number;
  low: number;
  open: number;
  close: number;
};
type OnlyWhenActive<Data> =
  | ({
      isActive: true;
    } & Data)
  | {
      isActive: false;
    };

export type RawIncentivesStats = {
  lp: OnlyWhenActive<{
    totalRewards: string;
    period: number;
    rewardsPerMarket: Record<string, string>;
    token: string;
    excludeHolders: Address[];
  }>;
  migration: OnlyWhenActive<{
    maxRebateBps: number;
    period: number;
  }>;
  trading: OnlyWhenActive<{
    /**
     * @deprecated use `maxRebatePercent` or `estimatedRebatePercent` instead
     */
    rebatePercent: number;
    maxRebatePercent: number;
    estimatedRebatePercent: number;
    allocation: string;
    period: number;
    token: Address;
  }>;
};

export type UserFeedbackBody = {
  feedback: UserFeedback;
};
