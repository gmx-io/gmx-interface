import { isLocal } from "config/env";
import { getOracleKeeperFallbackStateKey } from "config/localStorage";
import { Bar, FromNewToOldArray } from "domain/tradingview/types";
import {
  metrics,
  OracleKeeperFailureCounter,
  OracleKeeperFallbackCounter,
  OracleKeeperMetricMethodId,
} from "lib/metrics";
import { getOracleKeeperFallbackUrls, getOracleKeeperUrl } from "sdk/configs/oracleKeeper";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";
import { buildUrl } from "sdk/utils/buildUrl";

import {
  ApyInfo,
  ApyPeriod,
  BatchReportBody,
  DayPriceCandle,
  OracleFetcher,
  PerformanceAnnualizedResponse,
  PerformancePeriod,
  PerformanceSnapshotsResponse,
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

type FallbackState = {
  fallbackEndpoint: string;
  timestamp: number;
};

export const failsPerMinuteToFallback = 3;

export class OracleKeeperFetcher implements OracleFetcher {
  private readonly chainId: number;

  private isFallback: boolean;
  private fallbackUrls: string[];
  private fallbackThrottleTimerId: number | undefined;
  private fallbackIndex: number;
  private failTimes: number[];
  private mainUrl: string;

  constructor(p: { chainId: number }) {
    this.chainId = p.chainId;
    this.fallbackUrls = getOracleKeeperFallbackUrls(this.chainId);
    this.mainUrl = getOracleKeeperUrl(this.chainId);
    this.isFallback = false;
    this.failTimes = [];

    const storedState = this.loadStoredFallbackState();

    if (storedState) {
      this.isFallback = true;
      this.fallbackIndex = this.fallbackUrls.indexOf(storedState.fallbackEndpoint);
    }

    const mainUrlIndex = this.fallbackUrls.indexOf(this.mainUrl);

    if (this.fallbackIndex === -1 || this.fallbackIndex === mainUrlIndex) {
      this.isFallback = false;
      this.fallbackIndex = 0;
    }
  }

  get url() {
    return this.isFallback ? this.fallbackUrls[this.fallbackIndex] : this.mainUrl;
  }

  get storageKey() {
    return JSON.stringify(getOracleKeeperFallbackStateKey(this.chainId));
  }

  loadStoredFallbackState() {
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) return null;

    try {
      const parsed = JSON.parse(stored) as FallbackState;

      const isValidFallback = parsed.fallbackEndpoint && this.fallbackUrls.includes(parsed.fallbackEndpoint);

      return isValidFallback ? parsed : null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to load fallback state from localStorage", error);
      return null;
    }
  }

  saveStoredFallbackState(fallbackEndpoint: string) {
    try {
      const state: FallbackState = {
        fallbackEndpoint,
        timestamp: Date.now(),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to save fallback state to localStorage", error);
    }
  }

  handleFailure(method: OracleKeeperMetricMethodId) {
    if (this.fallbackThrottleTimerId) {
      return;
    }

    metrics.pushCounter<OracleKeeperFailureCounter>("oracleKeeper.failure", {
      chainId: this.chainId,
      method,
    });

    this.failTimes.push(Date.now());

    this.failTimes = this.failTimes.filter((time) => time > Date.now() - 60000);

    if (this.failTimes.length >= failsPerMinuteToFallback) {
      if (this.isFallback) {
        this.fallbackIndex = (this.fallbackIndex + 1) % this.fallbackUrls.length;
      } else {
        // First fallback url should be different from the main url
        this.fallbackIndex = this.fallbackUrls.findIndex((url) => url !== this.mainUrl);
      }

      // eslint-disable-next-line no-console
      console.warn(`oracle keeper fallback ${this.chainId} to ${this.fallbackIndex}`);
      this.isFallback = true;
      this.failTimes = [];

      metrics.pushCounter<OracleKeeperFallbackCounter>("oracleKeeper.fallback", {
        chainId: this.chainId,
      });

      this.saveStoredFallbackState(this.fallbackUrls[this.fallbackIndex]);
    }

    this.fallbackThrottleTimerId = window.setTimeout(() => {
      this.fallbackThrottleTimerId = undefined;
    }, 2000);
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
        this.handleFailure("tickers");

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
        this.handleFailure("24hPrices");
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
        this.handleFailure("candles");
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
        this.handleFailure("candles");
        throw e;
      });
  }

  async fetchIncentivesRewards(): Promise<RawIncentivesStats | null> {
    return fetch(
      buildUrl(this.url!, "/incentives", {
        ignoreStartDate: undefined,
      })
    )
      .then((res) => res.json())
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        this.handleFailure("incentives");
        return null;
      });
  }

  async fetchUiVersion(currentVersion: number, active: boolean): Promise<number> {
    return fetch(buildUrl(this.url!, `/ui/min_version?client_version=${currentVersion}&active=${active}`))
      .then((res) => res.json())
      .then((res) => res.version);
  }

  fetchPerformanceAnnualized(period: PerformancePeriod, address?: string): Promise<PerformanceAnnualizedResponse> {
    return fetch(buildUrl(this.url!, "/performance/annualized", { period, address }), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        this.handleFailure("annualized");
        throw e;
      });
  }

  fetchPerformanceSnapshots(period: PerformancePeriod, address?: string): Promise<PerformanceSnapshotsResponse> {
    return fetch(buildUrl(this.url!, "/performance/snapshots", { period, address }), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        this.handleFailure("snapshots");
        throw e;
      });
  }
}
