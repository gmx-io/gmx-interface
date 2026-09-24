import AppCrashFallback from '@/components/ErrorBoundary/AppCrashFallback';
import { reportAppCrash } from '@/components/ErrorBoundary/reportAppCrash';
import { useEffect, useRef, useState } from 'react';
import { useRouteError } from 'react-router-dom';

function normalizeRouteError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  return new Error('Unknown route error');
}

export default function AppRouteErrorBoundary() {
  const routeError = useRouteError();
  const hasReported = useRef(false);
  const [errorCode, setErrorCode] = useState<string>();

  useEffect(() => {
    if (hasReported.current) {
      return;
    }
    hasReported.current = true;

    const error = normalizeRouteError(routeError);
    console.error('[AppRouteErrorBoundary]', error);

    setErrorCode(reportAppCrash(error));
  }, [routeError]);

  return <AppCrashFallback errorCode={errorCode} />;
}
