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

function getAppVersion() {
  return process.env.REACT_APP_VERSION;
}

function getWalletNames() {
  const wallets = [
    { name: "rabby", check: () => checkWalletProperty("isRabbyWallet") },
    { name: "coinbase", check: () => checkWalletProperty("isCoinbaseWallet") },
    { name: "walletConnect", check: () => checkWalletProperty("isWalletConnect") },
    { name: "browserWallet", check: () => checkWalletProperty("isBrowserWallet") },
    { name: "trust", check: () => (window as any).trustwallet },
    { name: "binance", check: () => typeof (window as any).BinanceChain !== "undefined" },
    { name: "metamask", check: () => checkWalletProperty("isMetaMask") },
  ];

  return wallets.filter((wallet) => wallet.check()).map((wallet) => wallet.name);
}

function checkWalletProperty(property: string) {
  return (
    (typeof window.ethereum !== "undefined"
      ? Boolean(window?.ethereum?.[property])
      : Boolean((window as any)?.web3?.currentProvider?.[property])) || window[property]
  );
}

(window as any).getWalletNames = getWalletNames;
(window as any).getAppVersion = getAppVersion;
