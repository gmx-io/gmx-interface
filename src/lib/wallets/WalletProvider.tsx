import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { StyleSheetManager } from "styled-components";

import { colors } from "config/colors";
import { useTheme } from "context/ThemeContext/ThemeContext";
import type { startSolanaWallet } from "lib/solana/solanaWalletBootstrap";

import gmxLogo from "img/logo-icon.svg";

import { watchInjectedProviderAnnouncements } from "./announceInjectedProviders";
import { PRIVY_STYLIS_PLUGINS } from "./privyUiCompat";
import { SolanaWalletSessionProvider } from "./solanaWalletSession";
import {
  getWagmiConfig,
  getWagmiInitialState,
  getSupportedChains,
  PRIVY_APP_ID,
  PRIVY_LOGIN_METHODS,
  PRIVY_SIGNATURE_REQUEST_TIMEOUTS,
  PRIVY_WALLET_LIST,
} from "./walletConfig";

const queryClient = new QueryClient();

const supportedChains = getSupportedChains();
const defaultChain = supportedChains[0];
const gmxLogoElement = <img src={gmxLogo} alt="GMX" width={100} />;

export default function WalletProvider({
  children,
  solanaWallet,
}: {
  children: React.ReactNode;
  solanaWallet?: ReturnType<typeof startSolanaWallet>;
}) {
  const { theme } = useTheme();

  useEffect(() => watchInjectedProviderAnnouncements(), []);

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
      defaultChain,
      supportedChains: [...supportedChains],
      externalWallets: {
        signatureRequestTimeouts: PRIVY_SIGNATURE_REQUEST_TIMEOUTS,
        ...(solanaWallet ? { solana: { connectors: solanaWallet.connectors } } : {}),
      },
      embeddedWallets: {
        ethereum: {
          createOnLogin: "users-without-wallets" as const,
        },
      },
    }),
    [theme, solanaWallet]
  );

  return (
    <StyleSheetManager stylisPlugins={PRIVY_STYLIS_PLUGINS}>
      <PrivyProvider appId={PRIVY_APP_ID} config={privyConfig}>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={getWagmiConfig()} initialState={getWagmiInitialState()}>
            <SolanaWalletSessionProvider
              enabled={solanaWallet !== undefined}
              rememberedWalletId={solanaWallet?.rememberedWalletId}
            >
              {children}
            </SolanaWalletSessionProvider>
          </WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    </StyleSheetManager>
  );
}
