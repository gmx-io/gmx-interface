import { isDevelopment, isLocal } from "config/env";
import { METRICS_PENDING_EVENTS_KEY as CACHED_METRICS_DATA_KEY, METRICS_TIMERS_KEY } from "config/localStorage";
import { OracleFetcher } from "domain/synthetics/tokens";
import { deserializeBigIntsInObject, serializeBigIntsInObject } from "lib/numbers";
import { sleep } from "lib/sleep";
import { getAppVersion } from "lib/version";
import { getWalletNames } from "lib/wallets/getWalletNames";
import { prepareErrorMetricData } from "./errorReporting";
import { GlobalMetricData } from "./types";
import { METRIC_WINDOW_EVENT_NAME } from "./emitMetricEvent";
import { getStorageItem, setStorageItem } from "./storage";

export type MetricEventParams = {
  event: string;
  data?: object;
  time?: number;
  isError: boolean;
};

const MAX_METRICS_STORE_TIME = 1000 * 60 * 30; // 30 min
const MAX_QUEUE_LENGTH = 500;
const RETRY_INTERVAL = 2000;
const BANNED_CUSTOM_FIELDS = ["metricId"];

type CachedMetricData = { _metricDataCreated: number; metricId: string };
type CachedMetricsData = { [key: string]: CachedMetricData };
type Timers = { [key: string]: number };

export class Metrics {
  fetcher?: OracleFetcher;
  debug = false;
  globalMetricData: GlobalMetricData = {} as GlobalMetricData;
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

    if (this.queue.length > 0 && !this.isProcessing) {
      this._processQueue();
    }
  };

  setDebug = (val: boolean) => {
    this.debug = val;
  };

  setGlobalMetricData = (meta: GlobalMetricData) => {
    this.globalMetricData = { ...this.globalMetricData, ...meta };
  };

  // Require Generic type to be specified
  pushEvent = <T extends MetricEventParams = never, P extends T = T>(params: P) => {
    this.queue.push(params);

    if (this.fetcher && !this.isProcessing) {
      this._processQueue();
    }
  };

  _processQueue = (retriesLeft = 10): Promise<void> => {
    if (retriesLeft === 0) {
      this.isProcessing = false;
      if (this.debug) {
        // eslint-disable-next-line no-console
        console.log("Metrics: Retries exhausted");
      }

      return Promise.resolve();
    }

    if (this.queue.length === 0) {
      this.isProcessing = false;
      if (this.debug) {
        // eslint-disable-next-line no-console
        console.log("Metrics: Queue processed ");
      }
      return Promise.resolve();
    }

    // Avoid infinite queue growth
    if (this.queue.length >= MAX_QUEUE_LENGTH) {
      this.queue = this.queue.slice(MAX_QUEUE_LENGTH - 1);
      if (this.debug) {
        // eslint-disable-next-line no-console
        console.log("Metrics: Slice queue");
      }
    }

    const ev = this.queue.shift();

    if (!ev) {
      if (this.debug) {
        // eslint-disable-next-line no-console
        console.log("Metrics: No event to process");
      }
      return Promise.resolve();
    }

    this.isProcessing = true;

    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log(`Metrics: Sending event, queue length: ${this.queue.length}`);
    }

    return this._sendMetric(ev)
      .then(() => {
        return this._processQueue();
      })
      .catch((error) => {
        if (this.debug) {
          // eslint-disable-next-line no-console
          console.error(`Metrics: Error sending metric, retries left: ${retriesLeft}`, error);
        }

        this.queue.unshift(ev);

        return sleep(RETRY_INTERVAL).then(() => this._processQueue(retriesLeft - 1));
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
    this.pushEvent<MetricEventParams>(detail);
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

  // Require Generic type to be specified
  setCachedMetricData = <TData extends { metricId: string } = never, P extends TData = TData>(
    metricData: P
  ): P & CachedMetricData => {
    const { metricId } = metricData;

    const cachedMetricsData = getStorageItem(CACHED_METRICS_DATA_KEY);
    const metricsData: CachedMetricsData = cachedMetricsData
      ? this.deserializeCachedMetricsData(cachedMetricsData)
      : {};

    const cached = { _metricDataCreated: Date.now(), ...metricData };
    metricsData[metricId] = cached;

    setStorageItem(CACHED_METRICS_DATA_KEY, this.serializeCachedMetricsData(metricsData));

    return cached;
  };

  // Require Generic type to be specified
  getCachedMetricData = <TData extends { metricId: string } = never, P extends TData = TData>(
    metricId: P["metricId"],
    clear?: boolean
  ): (CachedMetricData & P) | undefined => {
    const cachedMetricsData = getStorageItem(CACHED_METRICS_DATA_KEY);

    if (!cachedMetricsData) {
      return undefined;
    }

    const metricsData = this.deserializeCachedMetricsData(cachedMetricsData);
    const event = metricsData[metricId];

    if (clear) {
      delete metricsData[metricId];
      setStorageItem(CACHED_METRICS_DATA_KEY, this.serializeCachedMetricsData(metricsData));
    }

    return event as CachedMetricData & P;
  };

  startTimer = (label: string, fromLocalStorage = true) => {
    const storedTimers = getStorageItem(METRICS_TIMERS_KEY, fromLocalStorage);
    const timers = storedTimers ? JSON.parse(storedTimers) : {};

    timers[label] = Date.now();

    setStorageItem(METRICS_TIMERS_KEY, JSON.stringify(this.clearOldTimers(timers)));
  };

  getTime = (label: string, clear?: boolean, fromLocalStorage = true) => {
    const storedTimers = getStorageItem(METRICS_TIMERS_KEY, fromLocalStorage);

    if (!storedTimers) {
      return undefined;
    }

    const timers = JSON.parse(storedTimers);
    const time = timers[label];

    if (!time) {
      return undefined;
    }

    if (clear) {
      delete timers[label];
      setStorageItem(METRICS_TIMERS_KEY, JSON.stringify(this.clearOldTimers(timers)));
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

  serializeCustomFields = (fields: object) => {
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
