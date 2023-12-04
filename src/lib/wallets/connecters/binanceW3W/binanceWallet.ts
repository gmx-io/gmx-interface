import type { InjectedConnectorOptions } from "@wagmi/core/connectors/injected";
import { InjectedConnector } from "wagmi/connectors/injected";
import { Chain, Wallet, getWalletConnectConnector } from "@rainbow-me/rainbowkit";
import { getWalletConnectUri } from "../helper";
import { getHref, isInBinance } from "@binance/w3w-utils";

export interface BinanceW3WOptions {
  projectId: string;
  chains: Chain[];
  walletConnectOptions?: any;
}

export default function binanceWallet({
  chains,
  projectId,
  walletConnectOptions,
  ...options
}: BinanceW3WOptions & InjectedConnectorOptions): Wallet {
  const shouldUseWalletConnect = !isInBinance();
  const provider = typeof window !== "undefined" && isInBinance() ? window.ethereum : undefined;
  return {
    id: "binance",
    name: "Binance Wallet",
    iconUrl: async () => (await import("./binanceWallet.svg")).default,
    iconAccent: "#1E1E1E",
    iconBackground: "#1E1E1E",
    installed: isInBinance() || undefined,
    downloadUrls: {
      android: "https://play.google.com/store/apps/details?id=com.binance.dev",
      ios: "https://apps.apple.com/us/app/binance-buy-bitcoin-crypto/id1436799971",
      mobile: "https://www.binance.com/en/download",
      qrCode: "https://www.binance.com/en/download",
    },

    createConnector: () => {
      const connector = shouldUseWalletConnect
        ? getWalletConnectConnector({
            chains,
            options: walletConnectOptions,
            projectId,
            version: "2",
            ...options,
          })
        : new InjectedConnector({
            chains,
            options: {
              getProvider: () => provider,
              ...options,
            },
          });

      const getUriMobile = async () => {
        const uri = await getWalletConnectUri(connector, "2");
        return getHref(true, uri);
      };

      const getUriQR = async () => {
        const uri = await getWalletConnectUri(connector, "2");
        return uri;
      };

      return {
        connector,
        mobile: {
          getUri: shouldUseWalletConnect ? getUriMobile : undefined,
        },
        qrCode: shouldUseWalletConnect
          ? {
              getUri: getUriQR,
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
