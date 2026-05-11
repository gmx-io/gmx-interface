import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo } from "react";
import { arbitrum } from "viem/chains";

import { colors } from "config/colors";
import { useTheme } from "context/ThemeContext/ThemeContext";

import gmxLogo from "img/logo-icon.svg";

import {
  getWagmiConfig,
  getSupportedChains,
  PRIVY_APP_ID,
  PRIVY_LOGIN_METHODS,
  PRIVY_WALLET_LIST,
} from "./walletConfig";

const queryClient = new QueryClient();

const supportedChains = getSupportedChains();
const gmxLogoElement = <img src={gmxLogo} alt="GMX" width={100} />;

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  const privyConfig = useMemo(
    () => ({
      appearance: {
        theme,
        accentColor: colors.blue[600][theme] as `#${string}`,
        logo: gmxLogoElement,
        walletChainType: "ethereum-only" as const,
        walletList: [...PRIVY_WALLET_LIST],
        showWalletLoginFirst: true,
      },
      loginMethods: [...PRIVY_LOGIN_METHODS],
      defaultChain: arbitrum,
      supportedChains: [...supportedChains],
      embeddedWallets: {
        ethereum: {
          createOnLogin: "users-without-wallets" as const,
        },
      },
    }),
    [theme]
  );

  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={privyConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={getWagmiConfig()}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
