import {
  getEmbeddedConnectedWallet,
  PrivyProvider,
  usePrivy,
  useWallets,
  type ConnectedWallet,
  type User,
} from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { colors } from "config/colors";
import { useTheme } from "context/ThemeContext/ThemeContext";

import gmxLogo from "img/logo-icon.svg";

import {
  getStoredPrivyActiveWallet,
  hasPrivyConnectIntent,
  isPrivyConnectIntentPending,
  isPrivyDisconnectInProgress,
  markPrivyConnectCompleted,
  shouldUseExternalWalletForCurrentPrivyConnect,
  shouldUseEmbeddedWalletForCurrentPrivyConnect,
  storePrivyActiveWallet,
} from "./privyWalletSelection";
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

function isPrivyEmbeddedWalletClient(walletClientType: string | undefined) {
  return walletClientType === "privy" || walletClientType === "privy-v2";
}

function isPrivyEmbeddedWallet(wallet: ConnectedWallet) {
  return isPrivyEmbeddedWalletClient(wallet.walletClientType) || wallet.connectorType === "embedded";
}

export function getActiveWalletForWagmi({
  isPrivyStateReady = true,
  wallets,
  user,
}: {
  isPrivyStateReady?: boolean;
  wallets: ConnectedWallet[];
  user: User | null;
}) {
  if (isPrivyDisconnectInProgress()) {
    return undefined;
  }

  if (!isPrivyStateReady && !user) {
    return wallets[0];
  }

  if (!user && !hasPrivyConnectIntent()) {
    return undefined;
  }

  if (!user && shouldUseExternalWalletForCurrentPrivyConnect()) {
    return wallets[0];
  }

  if (!user) {
    return undefined;
  }

  if (isPrivyConnectIntentPending()) {
    return undefined;
  }

  const isExplicitConnect = hasPrivyConnectIntent();

  if (shouldUseEmbeddedWalletForCurrentPrivyConnect()) {
    const embeddedWallet = getEmbeddedConnectedWallet(wallets) ?? wallets.find(isPrivyEmbeddedWallet);

    if (!embeddedWallet) {
      return undefined;
    }

    markPrivyConnectCompleted();
    storePrivyActiveWallet(embeddedWallet);
    return embeddedWallet;
  }

  const activeWallet = (isExplicitConnect ? undefined : getStoredPrivyActiveWallet(wallets)) ?? wallets[0];

  markPrivyConnectCompleted();
  storePrivyActiveWallet(activeWallet);

  return activeWallet;
}

export function isPrivyWagmiStateReady({ privyReady, walletsReady }: { privyReady: boolean; walletsReady: boolean }) {
  return privyReady && walletsReady;
}

function PrivyWagmiProvider({ children }: { children: React.ReactNode }) {
  const { ready: privyReady } = usePrivy();
  const { ready: walletsReady } = useWallets();
  const isPrivyStateReady = isPrivyWagmiStateReady({ privyReady, walletsReady });

  const setActiveWalletForWagmi = useCallback(
    ({ wallets, user }: { wallets: ConnectedWallet[]; user: User | null }) =>
      getActiveWalletForWagmi({ isPrivyStateReady, wallets, user }),
    [isPrivyStateReady]
  );

  return (
    <WagmiProvider config={getWagmiConfig()} setActiveWalletForWagmi={setActiveWalletForWagmi}>
      {children}
    </WagmiProvider>
  );
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
        <PrivyWagmiProvider>{children}</PrivyWagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
