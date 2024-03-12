import { getHref, isInBinance } from "@binance/w3w-utils";
import { t } from "@lingui/macro";
import { Chain, getWalletConnectConnector, Wallet } from "@rainbow-me/rainbowkit";
import type { DefaultWalletOptions } from "@rainbow-me/rainbowkit/dist/wallets/Wallet";
import { injected } from "@wagmi/core";
import identity from "lodash/identity";

export interface BinanceW3WOptions {
  projectId: string;
  chains: Chain[];
  walletConnectOptions?: any;
}

export default function binanceWallet({ projectId, walletConnectParameters }: DefaultWalletOptions): Wallet {
  const shouldUseWalletConnect = !isInBinance();

  return {
    id: "binance",
    name: "Binance Web3 Wallet",
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
    qrCode: shouldUseWalletConnect
      ? {
          getUri: identity,
          instructions: {
            learnMoreUrl: "https://www.binance.com/en/blog/markets/introducing-binance-web3-wallet-5931309459106555347",
            steps: [
              {
                // Getters are used to defer the translation until the locale is set
                get description() {
                  return t`Log in to your Binance app and tap [Wallets]. Go to [Web3].`;
                },
                step: "install",
                get title() {
                  return t`Open Binance app`;
                },
              },
              {
                get description() {
                  return t`Tap [Create Wallet] to start using your Web3 Wallet.`;
                },
                step: "create",
                get title() {
                  return t`Create or Import a Wallet`;
                },
              },
              {
                get description() {
                  return t`After you scan, a connection prompt will appear for you to connect your wallet.`;
                },
                step: "scan",
                get title() {
                  return t`Scan the QR code`;
                },
              },
            ],
          },
        }
      : undefined,

    mobile: {
      getUri: shouldUseWalletConnect ? (uri) => getHref(true, uri) : undefined,
    },

    createConnector: (params) => {
      if (shouldUseWalletConnect) {
        return getWalletConnectConnector({ projectId, walletConnectParameters })(params);
      }

      return injected();
    },
  };
}
