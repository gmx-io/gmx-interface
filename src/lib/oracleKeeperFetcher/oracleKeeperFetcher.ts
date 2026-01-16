import type { ContractsChainId } from "config/chains";
import type { Bar, FromNewToOldArray } from "domain/tradingview/types";
import { NetworkStatusObserver } from "lib/FallbackTracker/NetworkStatusObserver";
import { withFallback } from "lib/FallbackTracker/withFallback";
import { metrics, OracleKeeperFailureCounter } from "lib/metrics";
import { subscribeForOracleTrackerMetrics } from "lib/metrics/oracleTrackerMetrics";
import {
  getOracleKeeperFallbackUrls,
  getOracleKeeperUrl,
  ORACLE_FALLBACK_TRACKER_CONFIG,
} from "sdk/configs/oracleKeeper";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";
import { buildUrl } from "sdk/utils/buildUrl";

import { _debugOracleKeeper, OracleKeeperDebugFlags } from "./_debug";
import { OracleKeeperFallbackTracker } from "./OracleFallbackTracker";
import type {
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

export const failsPerMinuteToFallback = 3;

export class OracleKeeperFetcher implements OracleFetcher {
  chainId: ContractsChainId;
  mainUrl: string;
  oracleTracker: OracleKeeperFallbackTracker;

  constructor(p: { chainId: ContractsChainId }) {
    this.chainId = p.chainId;
    this.mainUrl = getOracleKeeperUrl(this.chainId);

    this.oracleTracker = new OracleKeeperFallbackTracker({
      ...ORACLE_FALLBACK_TRACKER_CONFIG,
      chainId: this.chainId,
      mainUrl: this.mainUrl,
      fallbacks: getOracleKeeperFallbackUrls(this.chainId),
      networkStatusObserver: NetworkStatusObserver.getInstance(),
    });

    this.oracleTracker.startTracking();
    subscribeForOracleTrackerMetrics(this.oracleTracker);
  }

  get url() {
    return this.oracleTracker.getCurrentEndpoints().primary;
  }

  handleFailure(path: string) {
    metrics.pushCounter<OracleKeeperFailureCounter>("oracleKeeper.failure", {
      chainId: this.chainId,
      method: path.split("?")[0],
    });

    this.oracleTracker.reportFailure(this.url);
  }

  request = (
    path: `/${string}`,
    opts: {
      query?: Record<string, string | number | undefined | boolean>;
      validate?: (res: any) => Error | undefined;
      // For simplicity, support only tickers debug id for now
      debugId?: "tickers";
    }
  ) => {
    const endpoints = this.oracleTracker.getCurrentEndpoints();

    return withFallback({
      endpoints: [endpoints.primary, ...endpoints.fallbacks],
      fn: (endpoint) => {
        if (opts.debugId) {
          _debugOracleKeeper?.dispatchEvent({
            type: `${opts.debugId}-start`,
            chainId: this.chainId,
            endpoint,
          });
        }

        return fetch(buildUrl(endpoint, path, opts.query))
          .then((res) => res.json())
          .then((res) => {
            const error = opts.validate?.(res);

            if (error) {
              throw error;
            }

            if (
              opts.debugId === "tickers" &&
              _debugOracleKeeper?.getFlag(OracleKeeperDebugFlags.TriggerTickersFailure)
            ) {
              return Promise.reject(new Error("Debug: Triggered tickers failure"));
            }

            if (opts.debugId) {
              _debugOracleKeeper?.dispatchEvent({
                type: `${opts.debugId}-success`,
                chainId: this.chainId,
                endpoint,
              });
            }

            if (
              opts.debugId === "tickers" &&
              _debugOracleKeeper?.getFlag(OracleKeeperDebugFlags.TriggerPartialTickers)
            ) {
              return res.slice(0, Math.floor(res.length / 2));
            }

            return res;
          })
          .catch((e) => {
            if (opts.debugId) {
              _debugOracleKeeper?.dispatchEvent({
                type: `${opts.debugId}-failed`,
                chainId: this.chainId,
                endpoint,
              });
            }

            // eslint-disable-next-line no-console
            console.error(e);
            this.handleFailure(path);
            throw e;
          });
      },
    });
  };

  post = (path: `/${string}`, body: any) => {
    const endpoints = this.oracleTracker.getCurrentEndpoints();
    return fetch(buildUrl(endpoints.primary, path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  };

  fetchTickers(): Promise<TickersResponse> {
    return this.request("/prices/tickers", {
      validate: (res) => {
        if (!res.length) {
          return new Error("Invalid tickers response");
        }

        return undefined;
      },
      debugId: "tickers",
    })
      .then((res) => {
        return res;
      })
      .catch((error) => {
        throw error;
      });
  }

  fetch24hPrices(): Promise<DayPriceCandle[]> {
    return this.request("/prices/24h", {
      validate: (res) => {
        if (!res?.length) {
          return new Error("Invalid 24h prices response");
        }
        return undefined;
      },
    });
  }

  fetchPostBatchReport(body: BatchReportBody): Promise<Response> {
    return this.post("/report/ui/batch_report", body);
  }

  fetchPostFeedback(body: UserFeedbackBody, debug): Promise<Response> {
    if (debug) {
      // eslint-disable-next-line no-console
      console.log("sendFeedback", body);
    }

    return this.post("/report/ui/feedback", body);
  }

  fetchApys(period: ApyPeriod): Promise<ApyInfo> {
    return this.request("/apy", { query: { period } });
  }

  async fetchOracleCandles(tokenSymbol: string, period: string, limit: number): Promise<FromNewToOldArray<Bar>> {
    tokenSymbol = getNormalizedTokenSymbol(tokenSymbol);

    return this.request("/prices/candles", { query: { tokenSymbol, period, limit } }).then((res) => {
      if (!Array.isArray(res.candles) || (res.candles.length === 0 && limit > 0)) {
        throw new Error("Invalid candles response");
      }

      return res.candles.map(parseOracleCandle);
    });
  }

  async fetchIncentivesRewards(): Promise<RawIncentivesStats | null> {
    return this.request("/incentives", { query: { ignoreStartDate: undefined } });
  }

  async fetchUiVersion(currentVersion: number, active: boolean): Promise<number> {
    return this.request("/ui/min_version", { query: { client_version: currentVersion, active } }).then(
      (res) => res.version
    );
  }

  fetchPerformanceAnnualized(period: PerformancePeriod, address?: string): Promise<PerformanceAnnualizedResponse> {
    return this.request("/performance/annualized", { query: { period, address } });
  }

  fetchPerformanceSnapshots(period: PerformancePeriod, address?: string): Promise<PerformanceSnapshotsResponse> {
    return this.request("/performance/snapshots", { query: { period, address } });
  }
}
