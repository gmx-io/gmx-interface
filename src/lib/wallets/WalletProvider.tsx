import { ReactNode } from "react";
import "@rainbow-me/rainbowkit/styles.css";
import merge from "lodash/merge";
import { getDefaultWallets, RainbowKitProvider, darkTheme, Theme } from "@rainbow-me/rainbowkit";
import { configureChains, createClient, WagmiConfig } from "wagmi";
import { arbitrum, avalanche, arbitrumGoerli, avalancheFuji } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";
import { isDevelopment } from "config/env";

const walletTheme = merge(darkTheme(), {
  colors: {
    modalBackground: "#16182e",
  },
} as Theme);

const { chains, provider, webSocketProvider } = configureChains(
  [arbitrum, avalanche, ...(isDevelopment() ? [arbitrumGoerli, avalancheFuji] : [])],
  [publicProvider()]
);

const { connectors } = getDefaultWallets({
  appName: "GMX",
  chains,
});

const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
  webSocketProvider,
});

export default function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider theme={walletTheme} chains={chains} modalSize="compact">
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
