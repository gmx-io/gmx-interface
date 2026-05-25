import { PrivyProvider, usePrivy, useWallets, type ConnectedWallet, type User } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { useEffect, useMemo } from "react";

import { colors } from "config/colors";
import { useTheme } from "context/ThemeContext/ThemeContext";

import gmxLogo from "img/logo-icon.svg";

import { PrivyConnectModalBridge } from "./PrivyConnectModalBridge";
import { PrivyWalletStateContext } from "./privyWalletState";
import {
  getSupportedChains,
  getWagmiConfig,
  PRIVY_APP_ID,
  PRIVY_LOGIN_METHODS,
  PRIVY_SIGNATURE_REQUEST_TIMEOUTS,
  PRIVY_WALLET_LIST,
} from "./walletConfig";

const supportedChains = getSupportedChains();
const defaultChain = supportedChains[0];
const gmxLogoElement = <img src={gmxLogo} alt="GMX" width={100} />;

function getActiveWalletForWagmi({ wallets, user }: { wallets: ConnectedWallet[]; user: User | null }) {
  return user ? wallets.find((wallet) => wallet.linked) ?? wallets[0] : wallets[0];
}

function PrivyWalletStateBridge({ children, onReady }: { children: React.ReactNode; onReady: () => void }) {
  const { ready: privyReady, user, logout } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const ready = privyReady && walletsReady;

  useEffect(() => {
    if (privyReady) {
      onReady();
    }
  }, [onReady, privyReady]);

  const value = useMemo(
    () => ({
      ready,
      user,
      wallets,
      logout,
    }),
    [logout, ready, user, wallets]
  );

  return <PrivyWalletStateContext.Provider value={value}>{children}</PrivyWalletStateContext.Provider>;
}

export default function PrivyWalletProvider({
  children,
  onLoaded,
  onReady,
}: {
  children: React.ReactNode;
  onLoaded: () => void;
  onReady: () => void;
}) {
  const { theme } = useTheme();

  useEffect(() => {
    onLoaded();
  }, [onLoaded]);

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
      <PrivyWalletStateBridge onReady={onReady}>
        <WagmiProvider config={getWagmiConfig()} setActiveWalletForWagmi={getActiveWalletForWagmi}>
          <PrivyConnectModalBridge />
          {children}
        </WagmiProvider>
      </PrivyWalletStateBridge>
    </PrivyProvider>
  );
}
