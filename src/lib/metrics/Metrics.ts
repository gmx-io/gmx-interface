import { isDevelopment, isLocal } from "config/env";
import {
  METRICS_PENDING_EVENTS_KEY as CACHED_METRICS_DATA_KEY,
  METRICS_TIMERS_KEY,
  SHOW_DEBUG_VALUES_KEY,
} from "config/localStorage";
import { OracleFetcher, useOracleKeeperFetcher } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { deserializeBigIntsInObject, serializeBigIntsInObject } from "lib/numbers";
import { getAppVersion } from "lib/version";
import { getWalletNames } from "lib/wallets/getWalletNames";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import { useEffect } from "react";
import { prepareErrorMetricData } from "./errorReporting";
import { METRIC_WINDOW_EVENT_NAME, MetricData, MetricEventType } from "./types";

type MetricEventParams = {
  event: MetricEventType;
  data?: MetricData;
  time?: number;
  isError: boolean;
};

const MAX_METRICS_STORE_TIME = 1000 * 60 * 30; // 30 min
const MAX_QUEUE_LENGTH = 500;
const RETRY_INTERVAL = 2000;
const BANNED_CUSTOM_FIELDS = ["metricId"];

type CachedMetricData = MetricData & { _metricDataCreated: number; metricId: string };
type CachedMetricsData = { [key: string]: CachedMetricData };
type Timers = { [key: string]: number };

type GlobalMetricData = {
  isMobileMetamask?: boolean;
};

export function useConfigureMetrics() {
  const { chainId } = useChainId();
  const fetcher = useOracleKeeperFetcher(chainId);
  const [showDebugValues] = useLocalStorageSerializeKey(SHOW_DEBUG_VALUES_KEY, false);
  const isMobileMetamask = useIsMetamaskMobile();

  useEffect(() => {
    metrics.subscribeToEvents();
    return () => {
      metrics.unsubscribeFromEvents();
    };
  }, []);

  useEffect(() => {
    metrics.setFetcher(fetcher);
  }, [fetcher]);

  useEffect(() => {
    metrics.setDebug(showDebugValues || false);
  }, [showDebugValues]);

  useEffect(() => {
    metrics.setGlobalMetricData({ isMobileMetamask });
  }, [isMobileMetamask]);
}

export class Metrics {
  fetcher?: OracleFetcher;
  debug = false;
  globalMetricData: GlobalMetricData = {};
  queue: MetricEventParams[] = [];
  eventIndex = 0;
  isProcessing = false;

  static _instance: Metrics;

  static get instance() {
    if (!Metrics._instance) {
      Metrics._instance = new Metrics();
    }

    return Metrics._instance;
  }

  setFetcher = (fetcher: OracleFetcher) => {
    this.fetcher = fetcher;
  };

  setDebug = (val: boolean) => {
    this.debug = val;
  };

  setGlobalMetricData = (meta: GlobalMetricData) => {
    this.globalMetricData = { ...this.globalMetricData, ...meta };
  };

  pushEvent = (params: MetricEventParams) => {
    this.queue.push(params);

    if (!this.isProcessing) {
      this._processQueue();
    }
  };

  _processQueue = (retriesLeft = 10) => {
    if (retriesLeft === 0) {
      this.isProcessing = false;
      if (this.debug) {
        // eslint-disable-next-line no-console
        console.log("Metrics: Retries exhausted");
      }
      return;
    }

    if (this.eventIndex >= this.queue.length) {
      this.eventIndex = 0;
      this.queue = [];
      this.isProcessing = false;
      if (this.debug) {
        // eslint-disable-next-line no-console
        console.log("Metrics: Queue processed ");
      }
      return;
    }

    if (this.eventIndex >= MAX_QUEUE_LENGTH) {
      this.eventIndex = 0;
      this.queue = this.queue.slice(MAX_QUEUE_LENGTH);
      if (this.debug) {
        // eslint-disable-next-line no-console
        console.log("Metrics: Slice queue");
      }
    }

    this.isProcessing = true;

    const ev = this.queue[this.eventIndex];

    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log(`Metrics: Sending event ${this.eventIndex}`, this.queue);
    }

    this._sendMetric(ev)
      .then(() => {
        this.eventIndex++;
        this._processQueue();
      })
      .catch((error) => {
        if (this.debug) {
          // eslint-disable-next-line no-console
          console.error(`Metrics: Error sending metric, retries left: ${retriesLeft}`, error);
        }

        window.setTimeout(() => {
          this._processQueue(retriesLeft - 1);
        }, RETRY_INTERVAL);
      });
  };

  _sendMetric = async (params: MetricEventParams) => {
    if (!this.fetcher) {
      throw new Error("Metrics: Fetcher is not initialized to send metric");
    }

    const { time, isError, data, event } = params;
    const wallets = await getWalletNames();
    const is1ct = (data as { is1ct: boolean })?.is1ct || false;

    await this.fetcher?.fetchPostReport2(
      {
        is1ct,
        isDev: isDevelopment(),
        host: window.location.host,
        url: window.location.href,
        wallet: wallets.current,
        event: event,
        version: getAppVersion(),
        isError,
        time,
        customFields: {
          ...(data ? this.serializeCustomFields(data) : {}),
          ...this.globalMetricData,
          wallets,
        },
      },
      this.debug
    );
  };

  _sendError = async (error: unknown, errorSource: string) => {
    const errorData = prepareErrorMetricData(error);

    if (!errorData) {
      return;
    }

    const { errorMessage, errorStack, errorStackHash, errorName, contractError, txErrorType, txErrorData } = errorData;

    const body = {
      report: {
        errorMessage,
        errorSource,
        errorStack,
        errorStackHash,
        errorName,
        contractError,
        txError: {
          type: txErrorType,
          errorData: txErrorData,
        },
        env: {
          REACT_APP_IS_HOME_SITE: process.env.REACT_APP_IS_HOME_SITE ?? null,
          REACT_APP_VERSION: process.env.REACT_APP_VERSION ?? null,
        },
        isDevelopment: isDevelopment(),
        host: window.location.host,
        url: window.location.href,
        wallets: await getWalletNames(),
      },
      version: getAppVersion(),
      isError: true,
    };

    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log("sendErrorToServer", body);
    }

    if (isLocal()) return;

    return this.fetcher?.fetchPostReport(body);
  };

  subscribeToEvents = () => {
    window.addEventListener(METRIC_WINDOW_EVENT_NAME, this.handleWindowEvent);
    window.addEventListener("error", this.handleError);
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
  };

  unsubscribeFromEvents = () => {
    window.removeEventListener(METRIC_WINDOW_EVENT_NAME, this.handleWindowEvent);
    window.removeEventListener("error", this.handleError);
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
  };

  handleWindowEvent = (event: Event) => {
    const { detail } = event as CustomEvent;
    this.pushEvent(detail);
  };

  handleError = (event) => {
    const error = event.error;

    if (error) {
      this._sendError(error, "globalError");
    }
  };

  handleUnhandledRejection = (event) => {
    const error = event.reason;

    if (error) {
      this._sendError(error, "unhandledRejection");
    }
  };

  setCachedMetricData = (metricId: string, metricData: MetricData) => {
    const cachedMetricsData = localStorage.getItem(CACHED_METRICS_DATA_KEY);
    const metricsData: CachedMetricsData = cachedMetricsData
      ? this.deserializeCachedMetricsData(cachedMetricsData)
      : {};
    metricsData[metricId] = { metricId, _metricDataCreated: Date.now(), ...metricData };
    localStorage.setItem(CACHED_METRICS_DATA_KEY, this.serializeCachedMetricsData(metricsData));
  };

  getCachedMetricData = (metricId: string, clear?: boolean): CachedMetricData | undefined => {
    const cachedMetricsData = localStorage.getItem(CACHED_METRICS_DATA_KEY);

    if (!cachedMetricsData) {
      return undefined;
    }

    const metricsData = this.deserializeCachedMetricsData(cachedMetricsData);
    const event = metricsData[metricId];

    if (clear) {
      delete metricsData[metricId];
      localStorage.setItem(CACHED_METRICS_DATA_KEY, this.serializeCachedMetricsData(metricsData));
    }

    return event;
  };

  startTimer = (metricId: string) => {
    const storedTimers = localStorage.getItem(METRICS_TIMERS_KEY);
    const timers = storedTimers ? JSON.parse(storedTimers) : {};

    timers[metricId] = Date.now();

    localStorage.setItem(METRICS_TIMERS_KEY, JSON.stringify(this.clearOldTimers(timers)));
  };

  getTime = (metricId: string, clear?: boolean) => {
    const storedTimers = localStorage.getItem(METRICS_TIMERS_KEY);

    if (!storedTimers) {
      return undefined;
    }

    const timers = JSON.parse(storedTimers);
    const time = timers[metricId];

    if (!time) {
      return undefined;
    }

    if (clear) {
      delete timers[metricId];
      localStorage.setItem(METRICS_TIMERS_KEY, JSON.stringify(this.clearOldTimers(timers)));
    }

    return Date.now() - time;
  };

  serializeCachedMetricsData = (metricsData: CachedMetricsData) => {
    return JSON.stringify(serializeBigIntsInObject(this.clearOldMetrics(metricsData)));
  };

  deserializeCachedMetricsData = (jsonStr: string): CachedMetricsData => {
    return deserializeBigIntsInObject(JSON.parse(jsonStr));
  };

  clearOldMetrics = (metricsData: CachedMetricsData) => {
    const result: { [key: string]: CachedMetricData } = {};

    Object.keys(metricsData).forEach((key) => {
      if (metricsData[key] && Date.now() - metricsData[key]._metricDataCreated < MAX_METRICS_STORE_TIME) {
        result[key] = metricsData[key];
      }
    });

    return result;
  };

  clearOldTimers = (timers: Timers) => {
    const result: { [key: string]: number } = {};

    Object.keys(timers).forEach((key) => {
      if (Date.now() - timers[key] < MAX_METRICS_STORE_TIME) {
        result[key] = timers[key];
      }
    });

    return result;
  };

  serializeCustomFields = (fields: MetricData) => {
    return Object.entries(fields).reduce((acc, [key, value]) => {
      if (BANNED_CUSTOM_FIELDS.includes(key)) {
        return acc;
      }

      if (typeof value === "bigint") {
        value = value.toString();
      }

      if (typeof value === "string" && value.length > 150) {
        value = value.slice(0, 150);
      }

      acc[key] = value;

      return acc;
    }, {});
  };
}

export const metrics = Metrics.instance;
