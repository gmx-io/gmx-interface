import type { Connector } from "wagmi/connectors";
import type { InjectedConnectorOptions } from "@wagmi/core/connectors/injected";
import { InjectedConnector } from "wagmi/connectors/injected";
import { Chain, Wallet, getWalletConnectConnector } from "@rainbow-me/rainbowkit";

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

export const bitGetWallet = ({
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
    id: "bitKeep",
    name: "Bitget Wallet",
    iconUrl: async () => (await import("./bitGetWallet.svg")).default,
    iconAccent: "#f6851a",
    iconBackground: "#fff",
    installed: !shouldUseWalletConnect ? isBitKeepInjected : undefined,
    downloadUrls: {
      android: "https://bitkeep.com/en/download?type=2",
      ios: "https://apps.apple.com/app/bitkeep/id1395301115",
      mobile: "https://bitkeep.com/en/download?type=2",
      qrCode: "https://bitkeep.com/en/download",
      chrome: "https://chrome.google.com/webstore/detail/bitkeep-crypto-nft-wallet/jiidiaalihmmhddjgbnbgdfflelocpak",
      browserExtension: "https://bitkeep.com/en/download",
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
            learnMoreUrl: "https://study.bitkeep.com",
            steps: [
              {
                description: "We recommend pinning BitKeep to your taskbar for quicker access to your wallet.",
                step: "install",
                title: "Install the BitKeep extension",
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
                learnMoreUrl: "https://study.bitkeep.com",
                steps: [
                  {
                    description: "We recommend putting BitKeep on your home screen for quicker access.",
                    step: "install",
                    title: "Open the BitKeep app",
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
