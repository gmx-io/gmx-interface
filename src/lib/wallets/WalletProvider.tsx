import { ReactNode } from "react";
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultWallets, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { configureChains, createClient, WagmiConfig } from "wagmi";
import { arbitrum, avalanche, arbitrumGoerli, avalancheFuji } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";
import { isDevelopment } from "config/env";

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
      <RainbowKitProvider chains={chains} modalSize="compact">
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
