import { isDevelopment, isLocal } from "config/env";
import cryptoJs from "crypto-js";
import CustomErrors from "abis/CustomErrors.json";
import { OracleFetcher, useOracleKeeperFetcher } from "domain/synthetics/tokens";
import { useEffect } from "react";
import { rainbowKitConfig } from "./wallets/rainbowKitConfig";
import { extractDataFromError } from "domain/synthetics/orders/simulateExecuteOrderTxn";
import { ethers } from "ethers";
import { extractError } from "./contracts/transactionErrors";

const IGNORE_ERROR_MESSAGES = ["user rejected action", "failed to fetch"];

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

const customErrors = new ethers.Contract(ethers.ZeroAddress, CustomErrors.abi);

export function sendErrorToServer(fetcher: OracleFetcher, error: unknown, errorSource: string) {
  if (isLocal()) return;

  let errorMessage = "Unknown error";
  let errorStack: string | undefined = undefined;
  let errorStackHash: string | undefined = undefined;
  let errorName: string | undefined = undefined;
  let contractError: string | undefined = undefined;
  let txError: any = undefined;

  try {
    errorMessage = hasMessage(error) ? error.message : String(error);

    if (IGNORE_ERROR_MESSAGES.some((ignore) => errorMessage.toLowerCase().startsWith(ignore))) {
      return;
    }

    errorStack = hasStack(error) ? error.stack : undefined;

    if (hasName(error)) {
      errorName = error.name;
    }

    try {
      txError = extractError(error as any);
      if (txError && txError.length) {
        const [message, type, errorData] = txError;
        errorMessage = message;
        txError = { type, errorData };
      }
    } catch (e) {
      //
    }

    if (errorMessage) {
      const errorData = extractDataFromError(errorMessage);
      const parsedError = customErrors.interface.parseError(errorData);

      if (parsedError) {
        contractError = parsedError.name;
      }
    }
  } catch (e) {
    //
  }

  if (errorStack) {
    errorStackHash = cryptoJs.SHA256(errorStack).toString(cryptoJs.enc.Hex);
  }

  const body = {
    report: {
      errorMessage,
      errorSource,
      errorStack,
      errorStackHash,
      errorName,
      contractError,
      txError,
      env: {
        REACT_APP_IS_HOME_SITE: process.env.REACT_APP_IS_HOME_SITE ?? null,
        REACT_APP_VERSION: process.env.REACT_APP_VERSION ?? null,
      },
      isDevelopment: isDevelopment(),
      host: window.location.host,
      url: window.location.href,
      wallets: getWalletNames(),
    },
    version: getAppVersion(),
    isError: true,
  };

  return fetcher.fetchPostReport(body);
}

function hasMessage(error: unknown): error is { message: string } {
  return typeof (error as { message: string }).message === "string";
}

function hasStack(error: unknown): error is { stack: string } {
  return typeof (error as { stack: string }).stack === "string";
}

function hasName(error: unknown): error is { name: string } {
  return typeof (error as { name: string }).name === "string";
}

function getAppVersion() {
  return process.env.REACT_APP_VERSION;
}

async function getWalletNames() {
  const walletNames = new Set<string>();

  for (const connector of rainbowKitConfig.connectors) {
    const isAuthorized = await connector.isAuthorized();
    if (isAuthorized) {
      walletNames.add(connector.name);
    }
  }

  return [...walletNames];
}

(window as any).getWalletNames = getWalletNames;
(window as any).getAppVersion = getAppVersion;
