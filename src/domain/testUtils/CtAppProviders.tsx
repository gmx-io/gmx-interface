import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect } from "react";
import { MemoryRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { Config, useAccount, useConnect, WagmiProvider } from "wagmi";
import "react-toastify/dist/ReactToastify.css";

import { ChainContextProvider } from "context/ChainContext/ChainContext";
import { ConnectModalProvider } from "context/ConnectModalContext/ConnectModalContext";
import { GlobalStateProvider } from "context/GlobalContext/GlobalContextProvider";
import { GmxAccountContextProvider } from "context/GmxAccountContext/GmxAccountContext";
import { PendingTxnsContextProvider } from "context/PendingTxnsContext/PendingTxnsContext";
import { SettingsContextProvider } from "context/SettingsContext/SettingsContextProvider";
import { SorterContextProvider } from "context/SorterContext/SorterContextProvider";
import { SubaccountContextProvider } from "context/SubaccountContext/SubaccountContextProvider";
import { ThemeProvider } from "context/ThemeContext/ThemeContext";
import { TokenPermitsContextProvider } from "context/TokenPermitsContext/TokenPermitsContextProvider";
import { TokensBalancesContextProvider } from "context/TokensBalancesContext/TokensBalancesContextProvider";
import { TokensFavoritesContextProvider } from "context/TokensFavoritesContext/TokensFavoritesContextProvider";

import { mockQueryClient } from "./mockSyntheticsState";

const INITIAL_ENTRIES = ["/trade"];

function AutoConnect({ chainId, children }: { chainId?: number; children: ReactNode }) {
  const { connect, connectors } = useConnect();
  const account = useAccount();

  useEffect(() => {
    if (account.status === "disconnected") {
      connect({ connector: connectors[0], chainId });
    }
  }, [account.status, connect, connectors, chainId]);

  // mount children only when connected so effects don't run twice
  if (account.status !== "connected" || (chainId !== undefined && account.chainId !== chainId)) {
    return null;
  }

  return <>{children}</>;
}

export type CtAppProvidersProps = {
  wagmiConfig: Config;
  /** Auto-connect the mock wallet before mounting children (default). Set false for disconnected scenarios. */
  autoConnect?: boolean;
  /** When set, the mock connector connects on this chain and children render only once it is current. */
  connectChainId?: number;
  children: ReactNode;
};

/**
 * The full app provider stack required to mount trading UI (SettingsModal, TradeBox)
 * in component tests, including auto-connecting the mock wallet
 * and a ToastContainer for status toasts.
 */
export function CtAppProviders({ wagmiConfig, autoConnect = true, connectChainId, children }: CtAppProvidersProps) {
  let content = (
    <>
      {children}
      <ToastContainer
        limit={1}
        position="bottom-right"
        hideProgressBar={true}
        newestOnTop={false}
        closeOnClick={false}
        draggable={false}
        icon={false}
      />
    </>
  );

  if (autoConnect) {
    content = <AutoConnect chainId={connectChainId}>{content}</AutoConnect>;
  }

  return (
    <MemoryRouter initialEntries={INITIAL_ENTRIES}>
      <ThemeProvider>
        <QueryClientProvider client={mockQueryClient}>
          <WagmiProvider config={wagmiConfig}>
            <GmxAccountContextProvider>
              <ChainContextProvider>
                <GlobalStateProvider>
                  <SettingsContextProvider>
                    <PendingTxnsContextProvider>
                      <I18nProvider i18n={i18n}>
                        <ConnectModalProvider>
                          <TokensBalancesContextProvider>
                            <TokenPermitsContextProvider>
                              <SubaccountContextProvider>
                                <TokensFavoritesContextProvider>
                                  <SorterContextProvider>{content}</SorterContextProvider>
                                </TokensFavoritesContextProvider>
                              </SubaccountContextProvider>
                            </TokenPermitsContextProvider>
                          </TokensBalancesContextProvider>
                        </ConnectModalProvider>
                      </I18nProvider>
                    </PendingTxnsContextProvider>
                  </SettingsContextProvider>
                </GlobalStateProvider>
              </ChainContextProvider>
            </GmxAccountContextProvider>
          </WagmiProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}
