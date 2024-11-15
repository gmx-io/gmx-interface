import { FromNewToOldArray, Bar } from "domain/tradingview/types";
import { UserFeedback } from "domain/synthetics/userFeedback";
import type { Address } from "viem";

export type UiReportPayload = {
  isError: boolean;
  version: string;
  event: string;
  message?: string;
  host: string;
  url?: string;
  time?: number;
  isDev?: boolean;
  customFields?: any;
};

export type CounterPayload = {
  event: string;
  version: string;
  isDev: boolean;
  host: string;
  abFlags: { [key: string]: boolean };
  customFields?: { [key: string]: any };
};

export type TimingPayload = {
  event: string;
  version: string;
  time: number;
  isDev: boolean;
  host: string;
  abFlags: { [key: string]: boolean };
  customFields?: { [key: string]: any };
};

export type UserEventPayload = {
  distinctId: string;
  event: string;
  customFields: any;
};

export type UserProfilePayload = {
  distinctId: string;
  customFields: any;
};

export type BatchReportItem =
  | {
      type: "event";
      payload: UiReportPayload;
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
      type: "userEvent";
      payload: UserEventPayload;
    }
  | {
      type: "userProfile";
      payload: UserProfilePayload;
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
  fetchPostEvent(body: UiReportPayload, debug?: boolean): Promise<Response>;
  fetchPostBatchReport(body: BatchReportBody, debug?: boolean): Promise<Response>;
  fetchPostFeedback(body: UserFeedbackBody, debug?: boolean): Promise<Response>;
  fetchPostTiming(
    body: {
      event: string;
      time: number;
      abFlags: Record<string, boolean>;
      customFields?: Record<string, boolean | string | number>;
    },
    debug?: boolean
  ): Promise<Response>;
  fetchPostCounter(
    body: {
      event: string;
      abFlags: Record<string, boolean>;
      customFields?: Record<string, boolean | string | number>;
    },
    debug?: boolean
  ): Promise<Response>;
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
