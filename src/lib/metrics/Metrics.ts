import { isDevelopment } from "config/env";
import { METRICS_PENDING_EVENTS_KEY as CACHED_METRICS_DATA_KEY, METRICS_TIMERS_KEY } from "config/localStorage";
import { deserializeBigIntsInObject, serializeBigIntsInObject } from "lib/numbers";
import {
  BatchReportItem,
  CounterPayload,
  EventPayload,
  OracleFetcher,
  TimingPayload,
} from "lib/oracleKeeperFetcher/types";
import { sleep } from "lib/sleep";
import { getAppVersion } from "lib/version";
import { getWalletNames, WalletNames } from "lib/wallets/getWalletNames";

import {
  METRIC_COUNTER_DISPATCH_NAME,
  METRIC_EVENT_DISPATCH_NAME,
  METRIC_TIMING_DISPATCH_NAME,
} from "./emitMetricEvent";
import { ErrorLike, parseError } from "../../ab/testMultichain/parseError";
import { getStorageItem, setStorageItem } from "./storage";
import { ErrorEvent, GlobalMetricData, LongTaskTiming } from "./types";

export type MetricEventParams = {
  event: string;
  data?: object;
  time?: number;
  isError?: boolean;
  isCounter?: boolean;
  isTiming?: boolean;
};

const MAX_METRICS_STORE_TIME = 1000 * 60; // 1 min
const MAX_QUEUE_LENGTH = 500;
const MAX_BATCH_LENGTH = 100;
const BATCH_INTERVAL_MS = 3000;
const BANNED_CUSTOM_FIELDS = ["metricId"];
const BAD_REQUEST_ERROR = "BadRequest";

type CachedMetricData = { _metricDataCreated: number; metricId: string };
type CachedMetricsData = { [key: string]: CachedMetricData };
type Timers = { [key: string]: number };

export class Metrics {
  fetcher?: OracleFetcher;
  debug = false;
  globalMetricData: GlobalMetricData = {} as GlobalMetricData;
  queue: BatchReportItem[] = [];
  wallets?: WalletNames;
  eventIndex = 0;
  isProcessing = false;
  isGlobalPropsFilled = false;
  initGlobalPropsRetries = 3;
  performanceObserver?: PerformanceObserver;

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

  async updateWalletNames() {
    this.wallets = await getWalletNames();
  }

  pushBatchItem = (item: BatchReportItem) => {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log(`Metrics: push ${item.type}`, item.payload);
    }

    this.queue.push(item);
  };

  sendBatchItems = (items: BatchReportItem[], logEvents = false) => {
    if (logEvents && this.debug) {
      // eslint-disable-next-line no-console
      console.log(`Metrics: send batch items`, items);
    }

    if (!this.fetcher) {
      return Promise.reject(new Error("Metrics: fetcher is not initialized"));
    }

    return this.fetcher.fetchPostBatchReport({ items }, this.debug);
  };

  // Require Generic type to be specified
  pushEvent = <T extends MetricEventParams = never>(params: T) => {
    const { time, isError, data, event } = params;

    const payload: EventPayload = {
      isDev: isDevelopment(),
      host: window.location.host,
      url: window.location.href,
      event: event,
      version: getAppVersion(),
      isError: Boolean(isError),
      time,
      isMissedGlobalMetricData: !this.getIsGlobalPropsInited(),
      customFields: {
        ...(data ? this.serializeCustomFields(data) : {}),
        ...this.globalMetricData,
        wallets: this.wallets,
      },
    };

    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log(`Metrics: push event`, event, payload);
    }

    this.queue.push({
      type: "event",
      payload,
    });
  };

  pushCounter<T extends { event: string; data?: object } = never>(event: T["event"], data?: T["data"]) {
    const payload: CounterPayload = {
      event,
      isDev: isDevelopment(),
      host: window.location.host,
      url: window.location.href,
      version: getAppVersion(),
      abFlags: this.globalMetricData.abFlags,
      customFields: data ? this.serializeCustomFields(data) : undefined,
    };

    this.queue.push({
      type: "counter",
      payload,
    });
  }

  pushTiming<T extends { event: string; data?: object } = never>(event: T["event"], time: number, data?: T["data"]) {
    const payload: TimingPayload = {
      event,
      isDev: isDevelopment(),
      host: window.location.host,
      url: window.location.href,
      version: getAppVersion(),
      time,
      abFlags: this.globalMetricData.abFlags,
      customFields: data ? this.serializeCustomFields(data) : undefined,
    };

    this.queue.push({
      type: "timing",
      payload,
    });
  }

  pushError = (error: ErrorLike | string, errorSource: string) => {
    const errorData = parseError(error);

    if (!errorData) {
      return;
    }

    const event: ErrorEvent = {
      event: "error",
      isError: true,
      data: {
        ...errorData,
        errorSource,
      },
    };

    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log("Metrics: error event", event);
    }

    this.pushEvent(event);
  };

  _processQueue = async (retryNumber = 0) => {
    this.isProcessing = true;

    // Calculate delay with exponential backoff
    const RETRY_DELAY = BATCH_INTERVAL_MS * Math.pow(2, retryNumber);

    if (!this.fetcher) {
      if (this.debug) {
        // eslint-disable-next-line no-console
        console.log("Metrics: fetcher is not initialized");
      }
      return sleep(RETRY_DELAY).then(() => this._processQueue(retryNumber + 1));
    }

    if (this.queue.length === 0) {
      if (this.debug) {
        // eslint-disable-next-line no-console
        console.log("Metrics: queue is empty");
      }
      return sleep(RETRY_DELAY).then(() => this._processQueue(retryNumber + 1));
    }

    if (!this.getIsGlobalPropsInited() && this.initGlobalPropsRetries > 0) {
      if (this.debug) {
        // eslint-disable-next-line no-console
        console.log("Metrics: global properties are not inited");
      }
      this.initGlobalPropsRetries--;
      return sleep(RETRY_DELAY).then(() => this._processQueue(retryNumber + 1));
    }

    // Avoid infinite queue growth
    if (this.queue.length > MAX_QUEUE_LENGTH) {
      this.queue = this.queue.slice(-MAX_QUEUE_LENGTH);
      if (this.debug) {
        // eslint-disable-next-line no-console
        console.log("Metrics: Slice queue");
      }
    }

    let items = this.queue.slice(0, MAX_BATCH_LENGTH);

    if (!this.isGlobalPropsFilled && this.globalMetricData.isInited && this.wallets) {
      items = items.map(this.fillMissedGlobalProps);
      this.isGlobalPropsFilled = true;
    }

    this.queue = this.queue.slice(MAX_BATCH_LENGTH - 1);

    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log(`Metrics: send batch metrics: ${items.length} items`);
    }

    return this.sendBatchItems(items, this.debug)
      .then(async (res) => {
        if (res.status === 400) {
          const errorData = await res.json();

          const error = new Error(JSON.stringify(errorData));
          error.name = BAD_REQUEST_ERROR;
        }

        if (!res.ok) {
          throw new Error(res.statusText);
        }

        return sleep(BATCH_INTERVAL_MS).then(() => this._processQueue());
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(`Metrics: Error sending batch metrics`, error);

        if (error.name === BAD_REQUEST_ERROR) {
          this.pushError(error, "Metrics");
        } else {
          this.queue.push(...items);
        }

        return sleep(RETRY_DELAY).then(() => this._processQueue(retryNumber + 1));
      });
  };

  subscribeToEvents = () => {
    window.addEventListener(METRIC_EVENT_DISPATCH_NAME, this.handleWindowEvent);
    window.addEventListener(METRIC_COUNTER_DISPATCH_NAME, this.handleWindowCounter);
    window.addEventListener(METRIC_TIMING_DISPATCH_NAME, this.handleWindowTiming);
    window.addEventListener("error", this.handleError);
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
    this.subscribeToLongTasks();
  };

  unsubscribeFromEvents = () => {
    window.removeEventListener(METRIC_EVENT_DISPATCH_NAME, this.handleWindowEvent);
    window.removeEventListener(METRIC_COUNTER_DISPATCH_NAME, this.handleWindowCounter);
    window.removeEventListener(METRIC_TIMING_DISPATCH_NAME, this.handleWindowTiming);
    window.removeEventListener("error", this.handleError);
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
    this.performanceObserver?.disconnect();
  };

  subscribeToLongTasks = () => {
    if (typeof PerformanceObserver === "undefined") {
      this.pushError(new Error("PerformanceObserver is not supported, skip"), "subscribeToLongTasks");
      return;
    }

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        try {
          list.getEntries().forEach((entry) => {
            if (entry.name === "self") {
              this.pushTiming<LongTaskTiming>("longtasks.self.timing", entry.duration, {
                isInitialLoad: performance.now() < 20000,
              });
              if (this.debug) {
                // eslint-disable-next-line no-console
                console.debug("Metrics: longTask duration", entry.duration);
              }
            }
          });
        } catch (error) {
          this.pushError(error, "subscribeToLongTasks");
          this.performanceObserver?.disconnect();
        }
      });

      this.performanceObserver.observe({ entryTypes: ["longtask"], buffered: true });
    } catch (error) {
      this.pushError(error, "subscribeToLongTasks");
      this.performanceObserver?.disconnect();
    }
  };

  handleWindowEvent = (event: Event) => {
    const { detail } = event as CustomEvent;
    this.pushEvent<MetricEventParams>(detail);
  };

  handleWindowCounter = (event: Event) => {
    const { detail } = event as CustomEvent;
    this.pushCounter<any>(detail.event, detail.data);
  };

  handleWindowTiming = (event: Event) => {
    const { detail } = event as CustomEvent;
    this.pushTiming<any>(detail.event, detail.time, detail.data);
  };

  handleError = (event) => {
    const error = event.error;

    if (error) {
      this.pushError(error, "globalError");
    }
  };

  handleUnhandledRejection = (event) => {
    const error = event.reason;

    if (error) {
      this.pushError(error, "unhandledRejection");
    }
  };

  // Require Generic type to be specified
  setCachedMetricData = <TData extends { metricId: string } = never>(metricData: TData): TData & CachedMetricData => {
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

  fillMissedGlobalProps = (item: BatchReportItem) => {
    if (item.type === "event" && item.payload.isMissedGlobalMetricData) {
      return {
        ...item,
        payload: {
          ...item.payload,
          customFields: {
            ...item.payload.customFields,
            ...this.globalMetricData,
            wallets: this.wallets,
          },
        },
      };
    }

    return item;
  };

  // Require Generic type to be specified
  getCachedMetricData = <TData extends { metricId: string } = never>(
    metricId: TData["metricId"],
    clear?: boolean
  ): (CachedMetricData & TData) | undefined => {
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

    return event as CachedMetricData & TData;
  };

  getIsGlobalPropsInited = () => {
    return this.globalMetricData.isInited && this.wallets;
  };

  startTimer = (label: string, fromLocalStorage = false) => {
    const storedTimers = getStorageItem(METRICS_TIMERS_KEY, fromLocalStorage);
    const timers = storedTimers ? JSON.parse(storedTimers) : {};

    timers[label] = Date.now();

    setStorageItem(METRICS_TIMERS_KEY, JSON.stringify(this.clearOldTimers(timers)));
  };

  getTime = (label: string, clear?: boolean, fromLocalStorage = false) => {
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

      const charLimit = key === "errorStack" ? 2000 : 500;
      if (typeof value === "string" && value.length > charLimit) {
        value = value.slice(0, charLimit);
      }

      acc[key] = value;

      return acc;
    }, {});
  };
}

export const metrics = Metrics.instance;
