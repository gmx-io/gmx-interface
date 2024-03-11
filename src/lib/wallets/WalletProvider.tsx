import { darkTheme, RainbowKitProvider, Theme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import merge from "lodash/merge";
import { WagmiProvider } from "wagmi";

import { rainbowKitConfig } from "./rainbowKitConfig";

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

const queryClient = new QueryClient();

export default function WalletProvider({ children }) {
  return (
    <WagmiProvider config={rainbowKitConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={walletTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
