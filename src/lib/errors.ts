import { isDevelopment, isLocal } from "config/env";
import { OracleFetcher, useOracleKeeperFetcher } from "domain/synthetics/tokens";
import { useEffect } from "react";

export function useErrorReporting(chainId: number) {
  const fetcher = useOracleKeeperFetcher(chainId);
  useEffect(() => {
    return subscribeToErrorEvents(fetcher);
  }, [fetcher]);
}

function subscribeToErrorEvents(fetcher: OracleFetcher) {
  const handleError = (event) => {
    const error = event.error;
    if (error) {
      sendErrorToServer(fetcher, error, "globalError");
    }
  };
  const handleUnhandledRejection = (event) => {
    const error = event.reason;
    if (error) {
      sendErrorToServer(fetcher, error, "unhandledRejection");
    }
  };

  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);

  return () => {
    window.removeEventListener("error", handleError);
    window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  };
}

export function sendErrorToServer(fetcher: OracleFetcher, error: unknown, source: string) {
  if (isLocal()) return;

  let errorMessage = "Unknown error";

  try {
    errorMessage = hasMessage(error) ? error.message : String(error);
  } catch (e) {
    //
  }

  const body = {
    report: {
      error: errorMessage,
      errorSource: source,
      env: {
        REACT_APP_IS_HOME_SITE: process.env.REACT_APP_IS_HOME_SITE ?? null,
        REACT_APP_VERSION: process.env.REACT_APP_VERSION ?? null,
      },
      isDevelopment: isDevelopment(),
      host: window.location.host,
      url: window.location.href,
    },
    version: getAppVersion(),
    isError: true,
  };

  return fetcher.fetchPostReport(body);
}

function hasMessage(error: unknown): error is { message: string } {
  return typeof (error as { message: string }).message === "string";
}

function getAppVersion() {
  return process.env.REACT_APP_VERSION;
}
