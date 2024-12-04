import { FromNewToOldArray, Bar } from "domain/tradingview/types";
import { UserFeedback } from "domain/synthetics/userFeedback";
import type { Address } from "viem";

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

export type BatchReportItem =
  | {
      type: "event";
      payload: EventPayload;
    }
  | {
      type: "counter";
      payload: CounterPayload;
    }
  | {
      type: "timing";
      payload: TimingPayload;
    }
  | {
      type: "userAnalyticsEvent";
      payload: UserAnalyticsEventPayload;
    }
  | {
      type: "userAnalyticsProfile";
      payload: UserAnalyticsProfilePayload;
    };

export type BatchReportBody = {
  items: BatchReportItem[];
};

export interface OracleFetcher {
  readonly url: string;
  fetchTickers(): Promise<TickersResponse>;
  fetch24hPrices(): Promise<DayPriceCandle[]>;
  fetchOracleCandles(tokenSymbol: string, period: string, limit: number): Promise<FromNewToOldArray<Bar>>;
  fetchIncentivesRewards(): Promise<RawIncentivesStats | null>;
  fetchPostBatchReport(body: BatchReportBody, debug?: boolean): Promise<Response>;
  fetchPostFeedback(body: UserFeedbackBody, debug?: boolean): Promise<Response>;
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
