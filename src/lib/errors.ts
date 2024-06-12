import { isDevelopment, isLocal } from "config/env";
import { getOracleKeeperUrl } from "config/oracleKeeper";
import { useEffect } from "react";

export function useErrorReporting(chainId: number) {
  useEffect(() => {
    return subscribeToErrorEvents(chainId);
  }, [chainId]);
}

function subscribeToErrorEvents(chainId: number) {
  const handleError = (event) => {
    const error = event.error;
    if (error) {
      sendErrorToServer(chainId, error, "globalError");
    }
  };
  const handleUnhandledRejection = (event) => {
    const error = event.reason;
    if (error) {
      sendErrorToServer(chainId, error, "unhandledRejection");
    }
  };

  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);

  return () => {
    window.removeEventListener("error", handleError);
    window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  };
}

export function sendErrorToServer(chainId: number, error: unknown, source: string) {
  const baseUrl = getOracleKeeperUrl(chainId, 0);
  const url = `${baseUrl}/report/ui`;

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
      isLocal: isLocal(),
      host: window.location.host,
      url: window.location.href,
    },
    version: getAppVersion(),
    isError: true,
  };

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function hasMessage(error: unknown): error is { message: string } {
  return typeof (error as { message: string }).message === "string";
}

function getAppVersion() {
  return process.env.REACT_APP_VERSION;
}
