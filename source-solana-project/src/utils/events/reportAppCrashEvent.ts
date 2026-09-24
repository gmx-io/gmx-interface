import { ErrorInfo } from 'react';

import { isMobile } from '@/utils/lib/headlessUiIsMobile';

const APP_CRASH_EVENT_TYPE = 'APP_CRASH';
const REPORT_TIMEOUT_MS = 5000;

export type AppCrashContent = {
  timestamp: number;
  uid: string;
  route: string;
  walletAddress: string | null;
  deviceType: string;
  deviceModel: string;
  browserType: string;
  errorCode: string;
  error: {
    message: string;
    name: string;
    stack?: string;
    componentStack?: string;
  };
};

function getDeviceType(): string {
  if (typeof navigator === 'undefined') {
    return 'unknown';
  }

  const ua = navigator.userAgent;

  if (
    /iPad/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  ) {
    return 'tablet';
  }

  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) {
    return 'tablet';
  }

  if (isMobile()) {
    return 'mobile';
  }

  return 'desktop';
}

function getDeviceModel(): string {
  if (typeof navigator === 'undefined') {
    return 'unknown';
  }

  const ua = navigator.userAgent;

  const androidMatch = ua.match(/Android[^;]*;\s*([^)]+?)\s+Build/i);
  if (androidMatch?.[1]) {
    return androidMatch[1].trim();
  }

  if (/iPhone/i.test(ua)) {
    const iphoneModelMatch = ua.match(/\biPhone(\d+,\d+)\b/i);
    if (iphoneModelMatch?.[1]) {
      return `iPhone ${iphoneModelMatch[1]}`;
    }
    return 'iPhone';
  }

  if (
    /iPad/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  ) {
    const ipadModelMatch = ua.match(/\biPad(\d+,\d+)\b/i);
    if (ipadModelMatch?.[1]) {
      return `iPad ${ipadModelMatch[1]}`;
    }
    return 'iPad';
  }

  if (/Macintosh/i.test(ua)) {
    return 'Macintosh';
  }

  if (/Windows/i.test(ua)) {
    return 'Windows PC';
  }

  if (/Linux/i.test(ua)) {
    return 'Linux PC';
  }

  return navigator.platform || 'unknown';
}

function getBrowserType(): string {
  if (typeof navigator === 'undefined') {
    return 'unknown';
  }

  const ua = navigator.userAgent;

  if (/Edg\//i.test(ua)) {
    return 'edge';
  }

  if (/OPR\/|Opera/i.test(ua)) {
    return 'opera';
  }

  if (/CriOS|Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    return 'chrome';
  }

  if (/FxiOS|Firefox\//i.test(ua)) {
    return 'firefox';
  }

  if (/Safari\//i.test(ua) && !/Chrome|CriOS/i.test(ua)) {
    return 'safari';
  }

  return 'unknown';
}

export function buildAppCrashContent(params: {
  traceId: string;
  errorCode: string;
  route: string;
  walletAddress: string | null;
  error: Error;
  errorInfo: ErrorInfo;
}): AppCrashContent {
  const { traceId, errorCode, route, walletAddress, error, errorInfo } = params;

  return {
    timestamp: Date.now(),
    uid: traceId,
    route,
    walletAddress,
    deviceType: getDeviceType(),
    deviceModel: getDeviceModel(),
    browserType: getBrowserType(),
    errorCode,
    error: {
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: errorInfo.componentStack ?? undefined,
    },
  };
}

export async function reportAppCrashEvent(params: {
  traceId: string;
  errorCode: string;
  route: string;
  walletAddress: string | null;
  error: Error;
  errorInfo: ErrorInfo;
}): Promise<void> {
  const contentObject = buildAppCrashContent(params);
  const content = JSON.stringify(contentObject);
  const payload = {
    type: APP_CRASH_EVENT_TYPE,
    traceId: params.traceId,
    content,
  };

  console.log('[AppCrash]', payload, contentObject);

  const eventsBaseUrl = import.meta.env.VITE_GMTRADE_EVENTS_URL;
  if (!eventsBaseUrl) {
    return;
  }

  const url = `${eventsBaseUrl.replace(/\/$/, '')}/common`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REPORT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error && err.name === 'AbortError'
        ? 'Request timed out'
        : err instanceof Error
          ? err.message
          : 'Unknown error';
    console.error('[AppCrash] Failed to report event:', message);
  } finally {
    clearTimeout(timeoutId);
  }
}
