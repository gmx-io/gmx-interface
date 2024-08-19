import { isDevelopment } from "config/env";
import { METRICS_PENDING_EVENTS_KEY as CACHED_METRICS_DATA_KEY, METRICS_TIMERS_KEY } from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccountAddress } from "context/SubaccountContext/SubaccountContext";
import { useOracleKeeperFetcher } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { deserializeBigIntsInObject, serializeBigIntsInObject } from "lib/numbers";
import { getAppVersion } from "lib/version";
import { getWalletNames } from "lib/wallets/getWalletNames";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import mapValues from "lodash/mapValues";
import { Context, PropsWithChildren, useEffect, useMemo } from "react";
import { createContext, useContextSelector } from "use-context-selector";
import { METRIC_EVENT_NAME } from "./emitMetricEvent";
import { MetricData, MetricEventType } from "./types";

const MAX_METRICS_STORE_TIME = 1000 * 60 * 30; // 30 min

type CachedMetricData = MetricData & { _metricDataCreated: number; metricId: string };
type CachedMetricsData = { [key: string]: CachedMetricData };
type Timers = { [key: string]: number };

export type MetricsContextType = {
  sendMetric: (params: {
    event: MetricEventType;
    data?: MetricData;
    time?: number;
    isError: boolean;
    message?: string;
  }) => void;
  setCachedMetricData: (metricId: string, metricData: MetricData) => void;
  getCachedMetricData: (metricId: string, clear?: boolean) => CachedMetricData | undefined;
  startTimer: (metricId: string) => void;
  getTime: (metricId: string, clear?: boolean) => number | undefined;
};

const context = createContext<MetricsContextType | null>(null);

export function MetricsContextProvider({ children }: PropsWithChildren) {
  const { chainId } = useChainId();
  const fetcher = useOracleKeeperFetcher(chainId);
  const subaccountAddress = useSubaccountAddress();
  const { showDebugValues } = useSettings();
  const isMobileMetamask = useIsMetamaskMobile();

  const value: MetricsContextType = useMemo(() => {
    const setCachedMetricData = (metricId: string, metricData: MetricData) => {
      const cachedMetricsData = localStorage.getItem(CACHED_METRICS_DATA_KEY);

      const metricsData: CachedMetricsData = cachedMetricsData ? deserializeCachedMetricsData(cachedMetricsData) : {};

      metricsData[metricId] = { metricId, _metricDataCreated: Date.now(), ...metricData };

      localStorage.setItem(CACHED_METRICS_DATA_KEY, serializeCachedMetricsData(metricsData));
    };

    const getCachedMetricData = (metricId: string, clear?: boolean): CachedMetricData | undefined => {
      const cachedMetricsData = localStorage.getItem(CACHED_METRICS_DATA_KEY);

      if (!cachedMetricsData) {
        return undefined;
      }

      const metricsData = deserializeCachedMetricsData(cachedMetricsData);

      const event = metricsData[metricId];

      if (clear) {
        delete metricsData[metricId];
        localStorage.setItem(CACHED_METRICS_DATA_KEY, serializeCachedMetricsData(metricsData));
      }

      return event;
    };

    const startTimer = (metricId: string) => {
      const storedTimers = localStorage.getItem(METRICS_TIMERS_KEY);
      const timers = storedTimers ? JSON.parse(storedTimers) : {};
      timers[metricId] = Date.now();

      localStorage.setItem(METRICS_TIMERS_KEY, JSON.stringify(clearOldTimers(timers)));
    };

    const getTime = (metricId: string, clear?: boolean) => {
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
        localStorage.setItem(METRICS_TIMERS_KEY, JSON.stringify(clearOldTimers(timers)));
      }

      return Date.now() - time;
    };

    async function sendMetric(params: {
      event: string;
      data?: MetricData;
      time?: number;
      isError: boolean;
      message?: string;
    }) {
      const { time, isError, data, message, event } = params;
      const wallets = await getWalletNames();

      if (showDebugValues) {
        // eslint-disable-next-line no-console
        console.log("sendMetric", {
          event,
          is1ct: Boolean(subaccountAddress),
          wallet: wallets.current,
          time,
          isError,
          data,
          message,
        });
      }

      await fetcher.fetchPostReport2({
        is1ct: Boolean(subaccountAddress),
        isDev: isDevelopment(),
        host: window.location.host,
        url: window.location.href,
        wallet: wallets.current,
        event: event,
        version: getAppVersion(),
        isError,
        time,
        customFields: {
          ...(data ? serializeCustomFields(data) : {}),
          message,
          isMobileMetamask,
          wallets,
        },
      });
    }

    return {
      sendMetric,
      setCachedMetricData,
      getCachedMetricData,
      startTimer,
      getTime,
    };
  }, [fetcher, isMobileMetamask, showDebugValues, subaccountAddress]);

  useEffect(() => {
    const handler: EventListener = (event: Event) => {
      const { detail } = event as CustomEvent;

      value.sendMetric({
        event: detail.event,
        isError: detail.isError,
        time: detail.time,
        message: detail.message,
        data: detail.data,
      });
    };

    window.addEventListener(METRIC_EVENT_NAME, handler);

    return () => {
      window.removeEventListener(METRIC_EVENT_NAME, handler);
    };
  }, [value]);

  return <context.Provider value={value}>{children}</context.Provider>;
}

export function useMetricsSelector<Selected>(selector: (s: MetricsContextType) => Selected) {
  return useContextSelector(context as Context<MetricsContextType>, selector) as Selected;
}

export function useMetrics() {
  return useMetricsSelector((s) => s);
}

function serializeCustomFields(fields: MetricData) {
  return mapValues(fields, (v: any) => {
    let result = v;

    if (typeof result === "bigint") {
      result = result.toString();
    }

    if (typeof result === "string" && result.length > 150) {
      result = result.slice(0, 150);
    }

    return result;
  });
}

function serializeCachedMetricsData(metricsData: CachedMetricsData) {
  return JSON.stringify(serializeBigIntsInObject(clearOldMetrics(metricsData)));
}

function deserializeCachedMetricsData(jsonStr: string): CachedMetricsData {
  return deserializeBigIntsInObject(JSON.parse(jsonStr));
}

function clearOldMetrics(metricsData: CachedMetricsData) {
  const result: { [key: string]: CachedMetricData } = {};

  Object.keys(metricsData).forEach((key) => {
    if (metricsData[key] && Date.now() - metricsData[key]._metricDataCreated < MAX_METRICS_STORE_TIME) {
      result[key] = metricsData[key];
    }
  });

  return result;
}

function clearOldTimers(timers: Timers) {
  const result: { [key: string]: number } = {};

  Object.keys(timers).forEach((key) => {
    if (Date.now() - timers[key] < MAX_METRICS_STORE_TIME) {
      result[key] = timers[key];
    }
  });

  return result;
}
