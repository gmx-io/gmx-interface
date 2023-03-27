import React from "react";
import "@rainbow-me/rainbowkit/styles.css";
import { connectorsForWallets, darkTheme, getDefaultWallets, RainbowKitProvider, Theme } from "@rainbow-me/rainbowkit";
import { ledgerWallet, trustWallet } from "@rainbow-me/rainbowkit/wallets";
import { configureChains, createClient, WagmiConfig } from "wagmi";
import { arbitrum, arbitrumGoerli, avalanche, avalancheFuji } from "wagmi/chains";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";
import merge from "lodash/merge";
import { isDevelopment } from "config/env";

const walletTheme = merge(darkTheme(), {
  colors: {
    modalBackground: "#16182e",
  },
} as Theme);

const { chains, provider } = configureChains(
  [arbitrum, avalanche, ...(isDevelopment() ? [arbitrumGoerli, avalancheFuji] : [])],
  [alchemyProvider({ apiKey: "EmVYwUw0N2tXOuG0SZfe5Z04rzBsCbr2" }), publicProvider()]
);

const { wallets } = getDefaultWallets({
  appName: "rainbowkit.com",
  chains,
});

const connectors = connectorsForWallets([
  ...wallets,
  {
    groupName: "More",
    wallets: [trustWallet({ chains }), ledgerWallet({ chains })],
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
