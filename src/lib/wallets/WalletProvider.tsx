import React from "react";
import "@rainbow-me/rainbowkit/styles.css";
import { connectorsForWallets, darkTheme, getDefaultWallets, RainbowKitProvider, Theme } from "@rainbow-me/rainbowkit";
import { ledgerWallet, trustWallet, argentWallet, zerionWallet } from "@rainbow-me/rainbowkit/wallets";
import { configureChains, createClient, WagmiConfig } from "wagmi";
import { arbitrum, arbitrumGoerli, avalanche, avalancheFuji } from "wagmi/chains";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";
import merge from "lodash/merge";
import { isDevelopment } from "config/env";
import { getAlchemyApiKey } from "config/chains";

const WALLET_CONNECT_PROJECT_ID = "de24cddbaf2a68f027eae30d9bb5df58";

const walletTheme = merge(darkTheme(), {
  colors: {
    modalBackground: "#212641",
    menuItemBackground: "#808aff14",
    accentColor: "#9da5f2",
  },
  radii: {
    modal: "4px",
    menuButton: "4px",
  },
} as Theme);

const { chains, provider } = configureChains(
  [arbitrum, avalanche, ...(isDevelopment() ? [arbitrumGoerli, avalancheFuji] : [])],
  [alchemyProvider({ apiKey: getAlchemyApiKey() }), publicProvider()]
);

const { wallets } = getDefaultWallets({
  appName: "GMX",
  projectId: WALLET_CONNECT_PROJECT_ID,
  chains,
});

const connectors = connectorsForWallets([
  ...wallets,
  {
    groupName: "More",
    wallets: [
      trustWallet({ chains, projectId: WALLET_CONNECT_PROJECT_ID }),
      ledgerWallet({ chains, projectId: WALLET_CONNECT_PROJECT_ID }),
      zerionWallet({ chains, projectId: WALLET_CONNECT_PROJECT_ID }),
      argentWallet({ chains, projectId: WALLET_CONNECT_PROJECT_ID }),
    ],
  },
]);

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
