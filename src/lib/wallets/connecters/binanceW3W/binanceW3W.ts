import type { Connector } from "wagmi/connectors";
import type { InjectedConnectorOptions } from "@wagmi/core/connectors/injected";
import { InjectedConnector } from "wagmi/connectors/injected";
import { Chain, Wallet, getWalletConnectConnector } from "@rainbow-me/rainbowkit";

const isInBinance = () => {
  try {
    return (window as any)?.ethereum?.isBinance === true;
  } catch (error) {
    return false;
  }
};

export const getHref = (isAndroid: boolean, wc?: string) => {
  const appID = "xoqXxUSMRccLCrZNRebmzj";
  const startPagePath = "L3BhZ2VzL2Rhc2hib2FyZC1uZXcvaW5kZXg=";

  let qs = `appId=${appID}&startPagePath=${startPagePath}`;
  if (wc) {
    const startPageQuery = encodeURI(`wc=${encodeURIComponent(wc)}&isDeepLink=true&id=${+new Date()}`);
    qs = `${qs}&startPageQuery=${startPageQuery}`;
  }
  const host = "//app.binance.com";
  if (isAndroid) {
    return `bnc:${host}/mp/app?${qs}`;
  }
  return `https:${host}/?_dp=${encodeURI(`/mp/app?${qs}`)}`;
};

export interface BinanceW3WOptions {
  projectId: string;
  chains: Chain[];
  walletConnectVersion?: "2";
  walletConnectOptions?: any;
}

export async function getWalletConnectUri(connector: Connector, version: "1" | "2"): Promise<string> {
  const provider = await connector.getProvider();
  return version === "2"
    ? new Promise<string>((resolve) => provider.once("display_uri", resolve))
    : provider.connector.uri;
}

export function isAndroid(): boolean {
  return (
    typeof navigator !== "undefined" && /Android\s([0-9.]+)/.test(navigator.userAgent) // Source: https://github.com/DamonOehlman/detect-browser/blob/master/src/index.ts
  );
}

export default function binanceW3W({
  chains,
  projectId,
  walletConnectOptions,
  walletConnectVersion = "2",
  ...options
}: BinanceW3WOptions & InjectedConnectorOptions): Wallet {
  const shouldUseWalletConnect = !isInBinance();

  return {
    id: "binanceW3w",
    name: "BinanceW3W",
    iconUrl: async () => (await import("./binanceW3W.svg")).default,
    iconAccent: "#1E1E1E",
    iconBackground: "#1E1E1E",
    installed: isInBinance() || undefined,
    downloadUrls: {
      android: "https://play.google.com/store/apps/details?id=com.binance.dev",
      ios: "https://apps.apple.com/us/app/binance-buy-bitcoin-crypto/id1436799971",
      mobile: "https://www.binance.com/en-DB/download",
      qrCode: "https://www.binance.com/en-DB/download",
    },

    createConnector: () => {
      const connector = shouldUseWalletConnect
        ? getWalletConnectConnector({
            chains,
            options: walletConnectOptions,
            projectId,
            version: walletConnectVersion,
          })
        : new InjectedConnector({
            chains,
            options,
          });

      const getUri = async () => {
        const uri = await getWalletConnectUri(connector, walletConnectVersion);

        return isAndroid() ? uri : `bitkeep://wc?uri=${encodeURIComponent(uri)}`;
      };

      return {
        connector,
        mobile: {
          getUri: shouldUseWalletConnect ? getUri : undefined,
        },
        qrCode: shouldUseWalletConnect
          ? {
              getUri: async () => getWalletConnectUri(connector, walletConnectVersion),
              instructions: {
                learnMoreUrl:
                  "https://www.binance.com/en/blog/markets/introducing-binance-web3-wallet-5931309459106555347",
                steps: [
                  {
                    description: "Log in to your Binance app and tap [Wallets]. Go to [Web3].",
                    step: "install",
                    title: "Open Binance app",
                  },
                  {
                    description: "Tap [Create Wallet] to start using your Web3 Wallet.",
                    step: "create",
                    title: "Create or Import a Wallet",
                  },
                  {
                    description: "After you scan, a connection prompt will appear for you to connect your wallet.",
                    step: "scan",
                    title: "Tap the scan button",
                  },
                ],
              },
            }
          : undefined,
      };
    },
  };
}
