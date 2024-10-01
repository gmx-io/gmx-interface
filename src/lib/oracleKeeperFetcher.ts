import type { Address } from "viem";

import { getOracleKeeperNextIndex, getOracleKeeperUrl } from "config/oracleKeeper";
import { getNormalizedTokenSymbol } from "config/tokens";
import { TIMEZONE_OFFSET_SEC } from "domain/prices/constants";
import { Bar, FromNewToOldArray } from "domain/tradingview/types";
import { buildUrl } from "lib/buildUrl";
import { UserFeedback } from "domain/synthetics/userFeedback";
import { isLocal, isDevelopment, APP_VERSION } from "config/env";

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

function parseOracleCandle(rawCandle: number[]): Bar {
  const [timestamp, open, high, low, close] = rawCandle;

  return {
    time: timestamp + TIMEZONE_OFFSET_SEC,
    open,
    high,
    low,
    close,
  };
}

let fallbackThrottleTimerId: any;

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

export class OracleKeeperFetcher implements OracleFetcher {
  private readonly chainId: number;
  private readonly oracleKeeperIndex: number;
  private readonly setOracleKeeperInstancesConfig?: (
    setter: (old: { [chainId: number]: number } | undefined) => {
      [chainId: number]: number;
    }
  ) => void;
  public readonly url: string;
  private readonly forceIncentivesActive: boolean;

  constructor(p: {
    chainId: number;
    oracleKeeperIndex: number;
    setOracleKeeperInstancesConfig?: (
      setter: (old: { [chainId: number]: number } | undefined) => {
        [chainId: number]: number;
      }
    ) => void;
    forceIncentivesActive: boolean;
  }) {
    this.chainId = p.chainId;
    this.oracleKeeperIndex = p.oracleKeeperIndex;
    this.setOracleKeeperInstancesConfig = p.setOracleKeeperInstancesConfig;
    this.url = getOracleKeeperUrl(this.chainId, this.oracleKeeperIndex);
    this.forceIncentivesActive = p.forceIncentivesActive;
  }

  switchOracleKeeper() {
    if (fallbackThrottleTimerId || !this.setOracleKeeperInstancesConfig) {
      return;
    }

    const nextIndex = getOracleKeeperNextIndex(this.chainId, this.oracleKeeperIndex);

    if (nextIndex === this.oracleKeeperIndex) {
      // eslint-disable-next-line no-console
      console.error(`no available oracle keeper for chain ${this.chainId}`);
      return;
    }

    // eslint-disable-next-line no-console
    console.log(`switch oracle keeper to ${getOracleKeeperUrl(this.chainId, nextIndex)}`);

    this.setOracleKeeperInstancesConfig((old) => {
      return { ...old, [this.chainId]: nextIndex };
    });

    fallbackThrottleTimerId = setTimeout(() => {
      fallbackThrottleTimerId = undefined;
    }, 5000);
  }

  fetchTickers(): Promise<TickersResponse> {
    return fetch(buildUrl(this.url!, "/prices/tickers"))
      .then((res) => res.json())
      .then((res) => {
        if (!res.length) {
          throw new Error("Invalid tickers response");
        }

        return res;
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        this.switchOracleKeeper();

        throw e;
      });
  }

  fetch24hPrices(): Promise<DayPriceCandle[]> {
    return fetch(buildUrl(this.url!, "/prices/24h"))
      .then((res) => res.json())
      .then((res) => {
        if (!res?.length) {
          throw new Error("Invalid 24h prices response");
        }

        return res;
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        this.switchOracleKeeper();
        throw e;
      });
  }

  fetchPostBatchReport(body: BatchReportBody, debug?: boolean): Promise<Response> {
    if (debug) {
      // eslint-disable-next-line no-console
      console.log("sendBatchMetrics", body);
    }

    if (isLocal()) {
      return Promise.resolve(new Response());
    }

    return fetch(buildUrl(this.url!, "/report/ui/batch_report"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  fetchPostEvent(body: UiReportPayload, debug?: boolean): Promise<Response> {
    if (debug) {
      // eslint-disable-next-line no-console
      console.log("sendMetric", body.event, body);
    }

    if (isLocal()) {
      return Promise.resolve(new Response());
    }

    return fetch(buildUrl(this.url!, "/report/ui/event"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  fetchPostFeedback(body: UserFeedbackBody, debug): Promise<Response> {
    if (debug) {
      // eslint-disable-next-line no-console
      console.log("sendFeedback", body);
    }

    return fetch(buildUrl(this.url!, "/report/ui/feedback"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  fetchPostTiming(
    body: {
      event: string;
      time: number;
      abFlags: Record<string, boolean>;
      customFields?: Record<string, boolean | string | number>;
    },
    debug?: boolean
  ): Promise<Response> {
    if (debug) {
      // eslint-disable-next-line no-console
      console.log("sendTiming", body);
    }

    return fetch(buildUrl(this.url!, "/report/ui/timing"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        isDev: isDevelopment(),
        host: self.location.host,
        version: APP_VERSION,
      }),
    });
  }

  fetchPostCounter(
    body: {
      event: string;
      abFlags: Record<string, boolean>;
      customFields?: Record<string, boolean | string | number>;
    },
    debug?: boolean
  ): Promise<Response> {
    if (debug) {
      // eslint-disable-next-line no-console
      console.log("sendCounter", body);
    }

    return fetch(buildUrl(this.url!, "/report/ui/counter"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        isDev: isDevelopment(),
        host: self.location.host,
        version: APP_VERSION,
      }),
    });
  }

  async fetchOracleCandles(tokenSymbol: string, period: string, limit: number): Promise<FromNewToOldArray<Bar>> {
    tokenSymbol = getNormalizedTokenSymbol(tokenSymbol);

    return fetch(buildUrl(this.url!, "/prices/candles", { tokenSymbol, period, limit }))
      .then((res) => res.json())
      .then((res) => {
        if (!Array.isArray(res.candles) || (res.candles.length === 0 && limit > 0)) {
          throw new Error("Invalid candles response");
        }

        return res.candles.map(parseOracleCandle);
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        this.switchOracleKeeper();
        throw e;
      });
  }

  async fetchIncentivesRewards(): Promise<RawIncentivesStats | null> {
    return fetch(
      buildUrl(this.url!, "/incentives", {
        ignoreStartDate: this.forceIncentivesActive ? "1" : undefined,
      })
    )
      .then((res) => res.json())
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        this.switchOracleKeeper();
        return null;
      });
  }
}
