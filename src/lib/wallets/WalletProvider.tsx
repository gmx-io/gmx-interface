import { PrivyProvider, useLogin, type LinkedAccountWithMetadata, type User } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useConfig, useReconnect } from "wagmi";

import { colors } from "config/colors";
import { useTheme } from "context/ThemeContext/ThemeContext";
import { metrics } from "lib/metrics";

import gmxLogo from "img/logo-icon.svg";

import { setRecentPrivyEmbeddedWalletConnector } from "./privyWagmi";
import {
  getWagmiConfig,
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

function isPrivyEmbeddedLinkedWallet(
  account: LinkedAccountWithMetadata
): account is LinkedAccountWithMetadata & { type: "wallet"; address: string } {
  return (
    account.type === "wallet" &&
    (account.walletClientType === "privy" || account.walletClientType === "privy-v2") &&
    account.chainType === "ethereum"
  );
}

export function getPrivyEmbeddedWalletAddress(user: User) {
  return user.linkedAccounts.find(isPrivyEmbeddedLinkedWallet)?.address;
}

function PrivyEmbeddedWalletWagmiSync() {
  const config = useConfig();
  const { reconnect } = useReconnect();

  const handleLoginComplete = useCallback(
    ({ user, loginAccount }: { user: User; loginAccount: LinkedAccountWithMetadata | null }) => {
      if (!loginAccount || loginAccount.type === "wallet") {
        return;
      }

      const embeddedWalletAddress = getPrivyEmbeddedWalletAddress(user);

      if (!embeddedWalletAddress) {
        return;
      }

      void setRecentPrivyEmbeddedWalletConnector(config, embeddedWalletAddress)
        .then(() => {
          reconnect();
        })
        .catch((error) => {
          metrics.pushError(error, "privyEmbeddedWalletWagmiSync");
        });
    },
    [config, reconnect]
  );

  useLogin({
    onComplete: handleLoginComplete,
  });

  return null;
}

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
      globalDisablePasskeys: true,
      defaultChain,
      supportedChains: [...supportedChains],
      externalWallets: {
        signatureRequestTimeouts: PRIVY_SIGNATURE_REQUEST_TIMEOUTS,
      },
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
        <WagmiProvider config={getWagmiConfig()}>
          <PrivyEmbeddedWalletWagmiSync />
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
