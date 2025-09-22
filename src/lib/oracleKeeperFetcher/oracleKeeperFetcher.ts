import random from "lodash/random";

import { isLocal } from "config/env";
import { Bar, FromNewToOldArray } from "domain/tradingview/types";
import { getOracleKeeperFallbackUrls, getOracleKeeperUrl } from "sdk/configs/oracleKeeper";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";
import { buildUrl } from "sdk/utils/buildUrl";

import {
  ApyInfo,
  ApyPeriod,
  BatchReportBody,
  DayPriceCandle,
  OracleFetcher,
  PerformanceInfo,
  RawIncentivesStats,
  TickersResponse,
  UserFeedbackBody,
} from "./types";

function parseOracleCandle(rawCandle: number[]): Bar {
  const [time, open, high, low, close] = rawCandle;

  return {
    time,
    open,
    high,
    low,
    close,
  };
}

const failsPerMinuteToFallback = 5;

export class OracleKeeperFetcher implements OracleFetcher {
  private readonly chainId: number;

  private readonly forceIncentivesActive: boolean;
  private isFallback: boolean;
  private fallbackUrls: string[];
  private fallbackThrottleTimerId: number | undefined;
  private fallbackIndex: number;
  private failTimes: number[];
  private mainUrl: string;

  constructor(p: { chainId: number; forceIncentivesActive: boolean }) {
    this.chainId = p.chainId;
    this.fallbackUrls = getOracleKeeperFallbackUrls(this.chainId);
    this.mainUrl = getOracleKeeperUrl(this.chainId);
    this.forceIncentivesActive = p.forceIncentivesActive;
    this.isFallback = false;
    this.failTimes = [];
  }

  get url() {
    return this.isFallback ? this.fallbackUrls[this.fallbackIndex] : this.mainUrl;
  }

  handleFailure() {
    if (this.fallbackThrottleTimerId) {
      return;
    }

    this.failTimes.push(Date.now());

    this.failTimes = this.failTimes.filter((time) => time > Date.now() - 60000);

    if (this.failTimes.length >= failsPerMinuteToFallback) {
      if (this.isFallback) {
        this.fallbackIndex = (this.fallbackIndex + 1) % this.fallbackUrls.length;
      } else {
        this.fallbackIndex = random(0, this.fallbackUrls.length - 1);
      }

      this.isFallback = true;
      this.failTimes = [];
    }

    this.fallbackThrottleTimerId = window.setTimeout(() => {
      this.fallbackThrottleTimerId = undefined;
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
        this.handleFailure();

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
        this.handleFailure();
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

  fetchPerformance(period: ApyPeriod): Promise<PerformanceInfo[]> {
    return fetch(buildUrl(this.url!, "/performance/annualized", { period }), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        this.handleFailure();
        throw e;
      });
  }

  fetchApys(period: ApyPeriod): Promise<ApyInfo> {
    return fetch(buildUrl(this.url!, "/apy", { period }), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        this.handleFailure();
        throw e;
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
        this.handleFailure();
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
        this.handleFailure();
        return null;
      });
  }

  async fetchUiVersion(currentVersion: number, active: boolean): Promise<number> {
    return fetch(buildUrl(this.url!, `/ui/min_version?client_version=${currentVersion}&active=${active}`))
      .then((res) => res.json())
      .then((res) => res.version);
  }
}
