import type { InjectedConnectorOptions } from "@wagmi/core/connectors/injected";
import { InjectedConnector } from "wagmi/connectors/injected";
import { Chain, Wallet, getWalletConnectConnector } from "@rainbow-me/rainbowkit";
import { getWalletConnectUri, isAndroid } from "../helper";

export interface BitKeepWalletLegacyOptions {
  projectId?: string;
  chains: Chain[];
  walletConnectVersion: "1";
  walletConnectOptions?: any;
}

export interface BitKeepWalletOptions {
  projectId: string;
  chains: Chain[];
  walletConnectVersion?: "2";
  walletConnectOptions?: any;
}

export const bitgetWallet = ({
  chains,
  projectId,
  walletConnectOptions,
  walletConnectVersion = "2",
  ...options
}: (BitKeepWalletLegacyOptions | BitKeepWalletOptions) & InjectedConnectorOptions): Wallet => {
  const isBitKeepInjected =
    typeof window !== "undefined" &&
    // @ts-expect-error
    window.bitkeep !== undefined &&
    // @ts-expect-error
    window.bitkeep.ethereum !== undefined &&
    // @ts-expect-error
    window.bitkeep.ethereum.isBitKeep === true;

  const shouldUseWalletConnect = !isBitKeepInjected;

  return {
    id: "bitget",
    name: "Bitget Wallet",
    iconUrl: async () => (await import("./bitgetWallet.svg")).default,
    iconAccent: "#f6851a",
    iconBackground: "#fff",
    installed: !shouldUseWalletConnect ? isBitKeepInjected : undefined,
    downloadUrls: {
      android: "https://web3.bitget.com/en/wallet-download?type=0",
      ios: "https://apps.apple.com/app/bitkeep/id1395301115",
      mobile: "https://web3.bitget.com/en/wallet-download?type=2",
      qrCode: "https://web3.bitget.com/en/wallet-download",
      chrome: "https://chrome.google.com/webstore/detail/bitkeep-crypto-nft-wallet/jiidiaalihmmhddjgbnbgdfflelocpak",
      browserExtension: "https://web3.bitget.com/en/wallet-download",
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
              // @ts-expect-error
              getProvider: () => window.bitkeep.ethereum,
              ...options,
            },
          });

      const getUri = async () => {
        const uri = await getWalletConnectUri(connector, walletConnectVersion);

        return isAndroid() ? uri : `bitkeep://wc?uri=${encodeURIComponent(uri)}`;
      };

      return {
        connector,
        extension: {
          instructions: {
            learnMoreUrl: "https://web3.bitget.com/en/academy",
            steps: [
              {
                description: "We recommend pinning Bitget Wallet to your taskbar for quicker access to your wallet.",
                step: "install",
                title: "Install the Bitget Wallet extension",
              },
              {
                description:
                  "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
                step: "create",
                title: "Create or Import a Wallet",
              },
              {
                description:
                  "Once you set up your wallet, click below to refresh the browser and load up the extension.",
                step: "refresh",
                title: "Refresh your browser",
              },
            ],
          },
        },
        mobile: {
          getUri: shouldUseWalletConnect ? getUri : undefined,
        },
        qrCode: shouldUseWalletConnect
          ? {
              getUri: async () => getWalletConnectUri(connector, walletConnectVersion),
              instructions: {
                learnMoreUrl: "https://web3.bitget.com/en/academy",
                steps: [
                  {
                    description: "We recommend putting Bitget Wallet on your home screen for quicker access.",
                    step: "install",
                    title: "Open the Bitget Wallet app",
                  },
                  {
                    description:
                      "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
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
};
