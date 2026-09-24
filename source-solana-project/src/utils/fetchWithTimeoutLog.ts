import { getAppCrashSnapshot } from '@/components/ErrorBoundary/appCrashSnapshot';
import { getTradeConfig } from '@/utils/tradeConfig';

const DEFAULT_LOG_AFTER_MS = 5000;
const LOG_QUEUE_INTERVAL_MS = 5000;
const SLOW_API_EVENT_TYPE = 'APP_SLOW_API';

type RequestLog = {
  requestId: string;
  type:
    | 'slow'
    | 'done'
    | 'exception'
    | 'slow-ws'
    | 'done-ws'
    | 'exception-ws';
  url: string;
  thresholdMs: number;
  requestTimestamp: number;
  reportTimestamp: number;
  href: string;
  walletAddress: string | null;
  body: BodyInit | null;
};

const requestLogQueue: RequestLog[] = [];

function enqueueRequestLog(log: RequestLog) {
  requestLogQueue.push(log);
}

function flushRequestLogQueue() {
  if (requestLogQueue.length === 0) {
    return;
  }

  const logs = requestLogQueue.splice(0);
  console.warn(logs);
  void reportSlowApiLogs(logs);
}

async function reportSlowApiLogs(logs: RequestLog[]) {
  const eventsBaseUrl = import.meta.env.VITE_GMTRADE_EVENTS_URL;
  if (!eventsBaseUrl) {
    return;
  }

  const payload = {
    type: SLOW_API_EVENT_TYPE,
    traceId: crypto.randomUUID(),
    content: JSON.stringify(logs),
  };
  const url = `${eventsBaseUrl.replace(/\/$/, '')}/common`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
  } catch (error) {
    console.error('[AppSlowApi] Failed to report event:', error);
  }
}

window.setInterval(() => {
  flushRequestLogQueue();
}, LOG_QUEUE_INTERVAL_MS);

export function createWebSocketFirstMessageTracker(url: string) {
  const tradeConfig = getTradeConfig();
  if (tradeConfig.enableSlowTrigger !== true) {
    return {
      firstMessage() {},
      failed() {},
    };
  }

  const requestId = crypto.randomUUID();
  const requestTimestamp = Date.now();
  const href = window.location.href;
  const { walletAddress } = getAppCrashSnapshot();
  const configuredTrigger = Number(tradeConfig.slowInterfaceTrigger);
  const logAfterMs =
    Number.isFinite(configuredTrigger) && configuredTrigger >= 0
      ? configuredTrigger
      : DEFAULT_LOG_AFTER_MS;
  let slowLogged = false;
  let settled = false;

  const enqueue = (type: 'slow-ws' | 'done-ws' | 'exception-ws') => {
    enqueueRequestLog({
      requestId,
      type,
      url,
      thresholdMs: logAfterMs,
      requestTimestamp,
      reportTimestamp: Date.now(),
      href,
      walletAddress,
      body: null,
    });
  };

  const timer = window.setTimeout(() => {
    if (settled) return;
    slowLogged = true;
    enqueue('slow-ws');
  }, logAfterMs);

  return {
    firstMessage() {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (slowLogged) enqueue('done-ws');
    },
    failed() {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      enqueue('exception-ws');
    },
  };
}

export function fetchWithTimeoutLog(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const tradeConfig = getTradeConfig();
  if (tradeConfig.enableSlowTrigger !== true) {
    return fetch(input, init);
  }

  const url = input instanceof Request ? input.url : input.toString();
  const requestId = crypto.randomUUID();
  const requestTimestamp = Date.now();
  const href = window.location.href;
  const { walletAddress } = getAppCrashSnapshot();
  const body = init?.body ?? null;
  const configuredTrigger = Number(tradeConfig.slowInterfaceTrigger);
  const logAfterMs =
    Number.isFinite(configuredTrigger) && configuredTrigger >= 0
      ? configuredTrigger
      : DEFAULT_LOG_AFTER_MS;
  let logged = false;
  const timer = window.setTimeout(() => {
    logged = true;
    enqueueRequestLog({
      requestId,
      type: 'slow',
      url,
      thresholdMs: logAfterMs,
      requestTimestamp,
      reportTimestamp: Date.now(),
      href,
      walletAddress,
      body,
    });
  }, logAfterMs);

  return fetch(input, init).then(
    (response) => {
      if (!logged) {
        window.clearTimeout(timer);
        return response;
      }

      enqueueRequestLog({
        requestId,
        type: 'done',
        url,
        thresholdMs: logAfterMs,
        requestTimestamp,
        reportTimestamp: Date.now(),
        href,
        walletAddress,
        body,
      });
      return response;
    },
    (error) => {
      window.clearTimeout(timer);
      enqueueRequestLog({
        requestId,
        type: 'exception',
        url,
        thresholdMs: logAfterMs,
        requestTimestamp,
        reportTimestamp: Date.now(),
        href,
        walletAddress,
        body,
      });
      throw error;
    }
  );
}
