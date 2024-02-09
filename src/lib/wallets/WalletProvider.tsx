import React from "react";
import "@rainbow-me/rainbowkit/styles.css";
import { connectorsForWallets, darkTheme, RainbowKitProvider, Theme, WalletList } from "@rainbow-me/rainbowkit";
import {
  ledgerWallet,
  safeWallet,
  rabbyWallet,
  injectedWallet,
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  rainbowWallet,
  imTokenWallet,
  zerionWallet,
  okxWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { configureChains, createClient, WagmiConfig } from "wagmi";
import { Chain, arbitrum, arbitrumGoerli, avalanche, avalancheFuji } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";
import merge from "lodash/merge";
import { isDevelopment } from "config/env";
import { coreWallet } from "./connecters/core/coreWallet";
import { bitgetWallet } from "./connecters/bitgetWallet/bitgetWallet";
import binanceWallet from "./connecters/binanceW3W/binanceWallet";

const WALLET_CONNECT_PROJECT_ID = "de24cddbaf2a68f027eae30d9bb5df58";
const APP_NAME = "GMX";

const walletTheme = merge(darkTheme(), {
  colors: {
    modalBackground: "#16182e",
    accentColor: "#9da5f2",
    menuItemBackground: "#808aff14",
  },
  radii: {
    modal: "4px",
    menuButton: "4px",
  },
} as Theme);

export const arbitrumSepolia: Chain = {
  id: 421614,
  name: "Arbitrum Sepolia",
  network: "arbitrum-sepolia",
  nativeCurrency: {
    name: "Arbitrum Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    alchemy: {
      http: ["https://arb-sepolia.g.alchemy.com/v2"],
      webSocket: ["wss://arb-sepolia.g.alchemy.com/v2"],
    },
    infura: {
      http: ["https://arbitrum-sepolia.infura.io/v3"],
      webSocket: ["wss://arbitrum-sepolia.infura.io/ws/v3"],
    },
    default: {
      http: ["https://sepolia-rollup.arbitrum.io/rpc"],
    },
    public: {
      http: ["https://sepolia-rollup.arbitrum.io/rpc"],
    },
  },
  blockExplorers: {
    etherscan: { name: "Arbiscan", url: "https://sepolia.arbiscan.io/" },
    default: { name: "Arbiscan", url: "https://sepolia.arbiscan.io/" },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 136,
    },
  },
  testnet: true,
};

const { chains, provider } = configureChains(
  [arbitrum, avalanche, ...(isDevelopment() ? [arbitrumGoerli, arbitrumSepolia, avalancheFuji] : [])],
  [publicProvider()]
);

const recommendedWalletList: WalletList = [
  {
    groupName: "Recommended",
    wallets: [
      injectedWallet({ chains }),
      safeWallet({ chains }),
      rabbyWallet({ chains }),
      metaMaskWallet({ chains, projectId: WALLET_CONNECT_PROJECT_ID }),
      walletConnectWallet({ chains, projectId: WALLET_CONNECT_PROJECT_ID }),
    ],
  },
];

const othersWalletList: WalletList = [
  {
    groupName: "Others",
    wallets: [
      coreWallet({ chains, projectId: WALLET_CONNECT_PROJECT_ID }),
      coinbaseWallet({ appName: APP_NAME, chains }),
      binanceWallet({ chains, projectId: WALLET_CONNECT_PROJECT_ID }),
      okxWallet({ chains, projectId: WALLET_CONNECT_PROJECT_ID }),
      ledgerWallet({ chains, projectId: WALLET_CONNECT_PROJECT_ID }),
      rainbowWallet({ chains, projectId: WALLET_CONNECT_PROJECT_ID }),
      bitgetWallet({ chains, projectId: WALLET_CONNECT_PROJECT_ID }),
      zerionWallet({ chains, projectId: WALLET_CONNECT_PROJECT_ID }),
      imTokenWallet({ chains, projectId: WALLET_CONNECT_PROJECT_ID }),
    ],
  },
];

const connectors = connectorsForWallets([...recommendedWalletList, ...othersWalletList]);

const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
});

export default function WalletProvider({ children }) {
  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider theme={walletTheme} chains={chains} modalSize="compact">
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
