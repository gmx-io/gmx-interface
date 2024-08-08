import { isDevelopment } from "config/env";
import { useSubaccountAddress } from "context/SubaccountContext/SubaccountContext";
import { useOracleKeeperFetcher } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { getAppVersion } from "lib/version";
import { getWalletNames } from "lib/wallets/getWalletNames";
import { Context, PropsWithChildren, useMemo, useRef } from "react";
import { createContext, useContextSelector } from "use-context-selector";
import mapValues from "lodash/mapValues";

export type MetricsContextType = {
  sendMetric: (params: {
    event: string;
    fields?: Record<string, any>;
    time?: number;
    isError: boolean;
    message?: string;
  }) => void;
  setPendingEvent: <T>(metricId: string, eventData: T) => T;
  getPendingEvent: (metricId: string, clear?: boolean) => any;
  startTimer: (metricId: string) => void;
  getTime: (metricId: string, clear?: boolean) => number | undefined;
};

const context = createContext<MetricsContextType | null>(null);

export function MetricsContextProvider({ children }: PropsWithChildren) {
  const { chainId } = useChainId();
  const fetcher = useOracleKeeperFetcher(chainId);
  const subaccountAddress = useSubaccountAddress();

  const pendingEvents = useRef({});
  const timers = useRef({});

  const value: MetricsContextType = useMemo(() => {
    const setPendingEvent = (metricId: string, eventData: any) => {
      pendingEvents.current[metricId] = { metricId, ...eventData };

      return eventData;
    };

    const getPendingEvent = (metricId: string, clear?: boolean) => {
      const event = pendingEvents.current[metricId];

      if (clear) {
        pendingEvents.current[metricId] = undefined;
      }

      return event;
    };

    const startTimer = (metricId: string) => {
      timers.current[metricId] = Date.now();
    };

    const getTime = (metricId: string, clear?: boolean) => {
      const time = timers.current[metricId];

      if (!time) {
        return undefined;
      }

      if (clear) {
        timers.current[metricId] = undefined;
      }

      return Date.now() - time;
    };

    async function sendMetric(params: {
      event: string;
      fields?: any;
      time?: number;
      isError: boolean;
      message?: string;
    }) {
      const { time, isError, fields, message, event } = params;
      const wallets = await getWalletNames();

      // eslint-disable-next-line no-console
      console.log("sendMetric", {
        time,
        isError,
        fields,
        message,
        event,
      });

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
        customFields: serializeCustomFields({ ...fields, message }),
      });
    }

    return {
      sendMetric,
      setPendingEvent,
      getPendingEvent,
      startTimer,
      getTime,
    };
  }, [fetcher, subaccountAddress]);

  return <context.Provider value={value}>{children}</context.Provider>;
}

export function useMetricsSelector<Selected>(selector: (s: MetricsContextType) => Selected) {
  return useContextSelector(context as Context<MetricsContextType>, selector) as Selected;
}

export function useMetrics() {
  return useMetricsSelector((s) => s);
}

function serializeCustomFields(fields: Record<string, any>) {
  return mapValues(fields, (v) => {
    if (typeof v === "bigint") {
      return v.toString();
    }

    return v;
  });
}
