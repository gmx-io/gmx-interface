import { ContractsChainId } from "config/chains";
import { isLocal } from "config/env";
import { Bar, FromNewToOldArray } from "domain/tradingview/types";
import { emitReportEndpointFailure } from "lib/FallbackTracker/events";
import { metrics, OracleKeeperFailureCounter, OracleKeeperMetricMethodId } from "lib/metrics";
import {
  getOracleKeeperFallbackUrls,
  getOracleKeeperUrl,
  ORACLE_FALLBACK_TRACKER_CONFIG,
} from "sdk/configs/oracleKeeper";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";
import { buildUrl } from "sdk/utils/buildUrl";

import { _debugOracleKeeper, OracleKeeperDebugEventType, OracleKeeperDebugFlags } from "./_debug";
import { OracleKeeperFallbackTracker } from "./OracleFallbackTracker";
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

export const failsPerMinuteToFallback = 3;

/**
 * 
 *  metrics.pushCounter<OracleKeeperFailureCounter>("oracleKeeper.failure", {
      chainId: this.chainId,
      method,
    });

     metrics.pushCounter<OracleKeeperFallbackCounter>("oracleKeeper.fallback", {
        chainId: this.chainId,
      });

 */

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
    });
  }

  get url() {
    return this.oracleTracker.getCurrentEndpoints().primary;
  }

  handleFailure(method: OracleKeeperMetricMethodId) {
    metrics.pushCounter<OracleKeeperFailureCounter>("oracleKeeper.failure", {
      chainId: this.chainId,
      method,
    });

    this.oracleTracker.reportFailure(this.url);
  }

  fetchTickers(): Promise<TickersResponse> {
    _debugOracleKeeper?.dispatchEvent({
      type: "tickers-start",
      chainId: this.chainId,
      endpoint: this.url,
    });

    return this.request("/prices/tickers", {
      validate: (res) => {
        if (!res.length) {
          return new Error("Invalid tickers response");
        }

        return undefined;
      },
    })
      .then((res) => {
        if (!res.length) {
          throw new Error("Invalid tickers response");
        }

        if (_debugOracleKeeper?.getFlag(OracleKeeperDebugFlags.TriggerTickersFailure)) {
          return Promise.reject(new Error("Debug: Triggered tickers failure"));
        }

        // Check for partial tickers debug flag
        if (_debugOracleKeeper?.getFlag(OracleKeeperDebugFlags.TriggerPartialTickers)) {
          this._dispatchDebug("tickers-partial");
          return res.slice(0, Math.floor(res.length / 2));
        }

        this._dispatchDebug("tickers-success");

        return res;
      })
      .catch((error) => {
        this._dispatchDebug("tickers-failed");
        throw error;
      });
  }

  request = (
    path: `/${string}`,
    opts: {
      query?: Record<string, string | number | undefined | boolean>;
      validate?: (res: any) => Error | undefined;
    }
  ) => {
    const endpoints = this.oracleTracker.getCurrentEndpoints();

    return fetch(buildUrl(endpoints.primary, path, opts.query))
      .then((res) => res.json())
      .then((res) => {
        const error = opts.validate?.(res);

        if (error) {
          throw error;
        }

        return res;
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        emitReportEndpointFailure({
          endpoint: endpoints.primary,
          trackerKey: this.oracleTracker.fallbackTracker.trackerKey,
        });
        throw e;
      });
  };

  post = (path: `/${string}`, body: any) => {
    const endpoints = this.oracleTracker.getCurrentEndpoints();
    return fetch(buildUrl(endpoints.primary, path), {
      method: "POST",
      body: JSON.stringify(body),
    });
  };

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
    if (isLocal()) {
      return Promise.resolve(new Response());
    }

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

  _dispatchDebug(type: OracleKeeperDebugEventType) {
    _debugOracleKeeper?.dispatchEvent({
      type,
      chainId: this.chainId,
      endpoint: this.url,
    });
  }
}
