import type { InjectedConnectorOptions } from "@wagmi/core/connectors/injected";
import { InjectedConnector } from "wagmi/connectors/injected";
import { Chain, Wallet, getWalletConnectConnector } from "@rainbow-me/rainbowkit";
import { getWalletConnectUri, isAndroid } from "../helper";

const isInBinance = () => {
  try {
    return (window as any)?.ethereum?.isBinance === true;
  } catch (error) {
    return false;
  }
};

export interface BinanceW3WOptions {
  projectId: string;
  chains: Chain[];
  walletConnectVersion?: "2";
  walletConnectOptions?: any;
}

export default function binanceW3W({
  chains,
  projectId,
  walletConnectOptions,
  walletConnectVersion = "2",
  ...options
}: BinanceW3WOptions & InjectedConnectorOptions): Wallet {
  const shouldUseWalletConnect = !isInBinance();
  const provider = typeof window !== "undefined" && isInBinance() ? window.ethereum : undefined;
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
            options: {
              getProvider: () => provider,
            },
          });

      const getUriMobile = async () => {
        const uri = await getWalletConnectUri(connector, walletConnectVersion);
        return isAndroid() ? uri : `bnc://wc?uri=${encodeURIComponent(uri)}`;
      };

      const getUriQR = async () => {
        const uri = await getWalletConnectUri(connector, walletConnectVersion);
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
