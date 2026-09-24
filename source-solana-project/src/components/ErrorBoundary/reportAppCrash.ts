import {
  getAppCrashSnapshot,
  getRouteFromWindowLocation,
} from '@/components/ErrorBoundary/appCrashSnapshot';
import { generateAppCrashIds } from '@/utils/events/generateAppCrashIds';
import { reportAppCrashEvent } from '@/utils/events/reportAppCrashEvent';
import { addReactError } from '@datadog/browser-rum-react';
import { ErrorInfo } from 'react';

export function reportAppCrash(error: Error, errorInfo?: ErrorInfo): string {
  const { traceId, errorCode } = generateAppCrashIds();
  const snapshot = getAppCrashSnapshot();
  const route = snapshot.route || getRouteFromWindowLocation();
  const walletAddress = snapshot.walletAddress;
  const normalizedErrorInfo = errorInfo ?? { componentStack: null };

  addReactError(error, normalizedErrorInfo);

  void reportAppCrashEvent({
    traceId,
    errorCode,
    route,
    walletAddress,
    error,
    errorInfo: normalizedErrorInfo,
  });

  return errorCode;
}
