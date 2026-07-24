import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { AES } from "crypto-js";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { createConfig, http, useAccount, useConnect, WagmiProvider } from "wagmi";
import { arbitrum, base } from "wagmi/chains";
import { mock } from "wagmi/connectors";
import "react-toastify/dist/ReactToastify.css";

import { ARBITRUM, SOURCE_BASE_MAINNET } from "config/chains";
import {
  getExpressOrdersEnabledKey,
  getGmxAccountGasPaymentTokenAddressKey,
  getSubaccountConfigKey,
  SELECTED_NETWORK_LOCAL_STORAGE_KEY,
  SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY,
} from "config/localStorage";
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
import { MOCK_L1_EXPRESS_ORDER_GAS_REFERENCE } from "domain/testUtils/mockChainData";
import { MOCK_ACCOUNT, mockQueryClient as queryClient } from "domain/testUtils/mockSyntheticsState";
import { MockSyntheticsStateProvider, DEFAULT_MOCK_TOKENS_DATA } from "domain/testUtils/MockSyntheticsStateProvider";
import { ETH_ADDRESS, ETH_TOKEN } from "domain/testUtils/mockTokens";
import { useChainId } from "lib/chains";
import { expandDecimals } from "lib/numbers";

import { SettingsModal } from "components/SettingsModal/SettingsModal";

const INITIAL_ENTRIES = ["/trade"];
const EXPRESS_AVAILABLE_FEATURES = { relayRouterEnabled: true, subaccountRelayRouterEnabled: true };
const SPONSORED_CALL_ALLOWED = { isSponsoredCallAllowed: true };

const multichainWagmiConfig = createConfig({
  chains: [arbitrum, base],
  transports: { [arbitrum.id]: http(), [base.id]: http() },
  connectors: [mock({ accounts: [MOCK_ACCOUNT] })],
});

function AutoConnectOnBase({ children }: { children: ReactNode }) {
  const { connect, connectors } = useConnect();
  const { status, chainId } = useAccount();

  useEffect(() => {
    if (status === "disconnected") {
      connect({ connector: connectors[0], chainId: SOURCE_BASE_MAINNET });
    }
  }, [status, connect, connectors]);

  if (status !== "connected" || chainId !== SOURCE_BASE_MAINNET) {
    return null;
  }

  return <>{children}</>;
}

const DEPOSIT_CONTROL_STYLE = { position: "fixed", top: 0, left: 0, zIndex: 2000 } as const;

function MultichainSyntheticsState({ children }: { children: ReactNode }) {
  const { srcChainId } = useChainId();
  const [gmxAccountGasTokenBalance, setGmxAccountGasTokenBalance] = useState(0n);

  const tokensData = useMemo(
    () => ({
      ...DEFAULT_MOCK_TOKENS_DATA,
      [ETH_ADDRESS]: { ...ETH_TOKEN, gmxAccountBalance: gmxAccountGasTokenBalance },
    }),
    [gmxAccountGasTokenBalance]
  );

  return (
    <MockSyntheticsStateProvider
      features={EXPRESS_AVAILABLE_FEATURES}
      sponsoredCallBalanceData={SPONSORED_CALL_ALLOWED}
      srcChainId={srcChainId}
      l1ExpressOrderGasReference={MOCK_L1_EXPRESS_ORDER_GAS_REFERENCE}
      tokensData={tokensData}
    >
      <button
        type="button"
        data-qa="deposit-gas-payment-token"
        style={DEPOSIT_CONTROL_STYLE}
        onClick={() => setGmxAccountGasTokenBalance(expandDecimals(1, ETH_TOKEN.decimals))}
      >
        Deposit gas payment token
      </button>
      {children}
    </MockSyntheticsStateProvider>
  );
}

export type OneClickMultichainDeactivationStoryProps = {
  seedSubaccountAddress: string;
  seedSubaccountPrivateKey: string;
};

export function OneClickMultichainDeactivationStory({
  seedSubaccountAddress,
  seedSubaccountPrivateKey,
}: OneClickMultichainDeactivationStoryProps) {
  // eslint-disable-next-line react/hook-use-state
  useState(() => {
    localStorage.setItem(JSON.stringify(getExpressOrdersEnabledKey(ARBITRUM, MOCK_ACCOUNT)), "true");

    localStorage.setItem(
      JSON.stringify(getGmxAccountGasPaymentTokenAddressKey(ARBITRUM, MOCK_ACCOUNT)),
      JSON.stringify(ETH_ADDRESS)
    );

    const encryptedPrivateKey = AES.encrypt(seedSubaccountPrivateKey, MOCK_ACCOUNT).toString();
    localStorage.setItem(
      JSON.stringify(getSubaccountConfigKey(ARBITRUM, MOCK_ACCOUNT)),
      JSON.stringify({ address: seedSubaccountAddress, privateKey: encryptedPrivateKey, isNew: true })
    );

    localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, String(SOURCE_BASE_MAINNET));
    localStorage.setItem(SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY, "true");

    return true;
  });

  const [isSettingsVisible, setIsSettingsVisible] = useState(true);

  return (
    <MemoryRouter initialEntries={INITIAL_ENTRIES}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={multichainWagmiConfig}>
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
                                  <SorterContextProvider>
                                    <AutoConnectOnBase>
                                      <MultichainSyntheticsState>
                                        <SettingsModal
                                          isSettingsVisible={isSettingsVisible}
                                          setIsSettingsVisible={setIsSettingsVisible}
                                        />
                                        <ToastContainer
                                          limit={1}
                                          position="bottom-right"
                                          hideProgressBar={true}
                                          newestOnTop={false}
                                          closeOnClick={false}
                                          draggable={false}
                                          icon={false}
                                        />
                                      </MultichainSyntheticsState>
                                    </AutoConnectOnBase>
                                  </SorterContextProvider>
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
