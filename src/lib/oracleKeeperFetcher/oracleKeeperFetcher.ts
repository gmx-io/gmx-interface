import { ContractsChainId } from "config/chains";
import type { UiFlag } from "domain/synthetics/uiFlags/useUiFlagsRequest";
import { Bar, FromNewToOldArray } from "domain/tradingview/types";
import { NetworkStatusObserver } from "lib/FallbackTracker/NetworkStatusObserver";
import { withFallback } from "lib/FallbackTracker/withFallback";
import { metrics, OracleKeeperFailureCounter, TickersPartialDataCounter } from "lib/metrics";
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
import {
  ApiMarket,
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
} from "./types";
import { consumeUiFlagsPrefetch } from "./uiFlagsPrefetch";

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
  expectedTickerAddresses = new Set<string>();

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

  handleFailure(path: string, endpoint: string = this.url) {
    metrics.pushCounter<OracleKeeperFailureCounter>("oracleKeeper.failure", {
      chainId: this.chainId,
      method: path.split("?")[0],
    });

    this.oracleTracker.reportFailure(endpoint);
  }

  handlePartialTickers(endpoint: string) {
    // eslint-disable-next-line no-console
    console.warn("tickersPartialData", { endpoint });

    _debugOracleKeeper?.dispatchEvent({
      type: "tickers-partial",
      chainId: this.chainId,
      endpoint,
    });

    metrics.pushCounter<TickersPartialDataCounter>("tickersPartialData");
    this.handleFailure("tickers", endpoint);
  }

  request = (
    path: `/${string}`,
    opts: {
      query?: Record<string, string | number | undefined | boolean>;
      validate?: (res: any) => Error | undefined;
      isComplete?: (res: any) => boolean;
      onIncomplete?: (endpoint: string) => void;
      // For simplicity, support only tickers debug id for now
      debugId?: "tickers";
    }
  ) => {
    const endpoints = this.oracleTracker.getCurrentEndpoints();
    let lastIncompleteResult: any;

    return withFallback<any, string>({
      endpoints: [endpoints.primary, ...endpoints.fallbacks],
      shouldFallback: (error, result) => Boolean(error) || (opts.isComplete !== undefined && !opts.isComplete(result)),
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
              endpoint === endpoints.primary &&
              _debugOracleKeeper?.getFlag(OracleKeeperDebugFlags.TriggerPartialTickers)
            ) {
              res = res.slice(0, Math.floor(res.length / 2));
            }

            if (opts.isComplete !== undefined && !opts.isComplete(res)) {
              lastIncompleteResult = res;
              opts.onIncomplete?.(endpoint);
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
    }).catch((error) => {
      if (lastIncompleteResult !== undefined) {
        return lastIncompleteResult;
      }

      throw error;
    });
  };

  post = (path: `/${string}`, body: any, { keepalive = false }: { keepalive?: boolean } = {}) => {
    const endpoints = this.oracleTracker.getCurrentEndpoints();
    const baseUrl = endpoints.primary;
    const serializedBody = JSON.stringify(body);
    return fetch(buildUrl(baseUrl, path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: serializedBody,
      keepalive: keepalive && new Blob([serializedBody]).size < 64 * 1024,
    });
  };

  fetchTickers(): Promise<TickersResponse> {
    const incompleteEndpoints: string[] = [];

    return this.request("/prices/tickers", {
      validate: (res) => {
        if (!res.length) {
          return new Error("Invalid tickers response");
        }

        return undefined;
      },
      isComplete: (res: TickersResponse) => this.hasExpectedTickers(res),
      onIncomplete: (endpoint) => incompleteEndpoints.push(endpoint),
      debugId: "tickers",
    }).then((tickers: TickersResponse) => {
      if (this.hasExpectedTickers(tickers)) {
        incompleteEndpoints.forEach((endpoint) => this.handlePartialTickers(endpoint));
      }

      this.expectedTickerAddresses = new Set(tickers.map((ticker) => ticker.tokenAddress));

      return tickers;
    });
  }

  hasExpectedTickers(tickers: TickersResponse) {
    const received = new Set(tickers.map((ticker) => ticker.tokenAddress));

    return Array.from(this.expectedTickerAddresses).every((address) => received.has(address));
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
    return this.post("/report/ui/batch_report", body, { keepalive: true });
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

  fetchUiFlags(): Promise<Record<string, UiFlag>> {
    const prefetched = consumeUiFlagsPrefetch(
      buildUrl(this.oracleTracker.getCurrentEndpoints().primary, "/ui-flags/v2")
    );

    if (prefetched) {
      return prefetched.then((flags) => (flags ? (flags as Record<string, UiFlag>) : this.request("/ui-flags/v2", {})));
    }

    return this.request("/ui-flags/v2", {});
  }

  fetchMarkets(): Promise<ApiMarket[]> {
    return this.request("/markets", {
      validate: (res) => {
        if (!res || !Array.isArray(res.markets)) return new Error("Invalid /markets response");
        return undefined;
      },
    }).then((res) => res.markets as ApiMarket[]);
  }
}
