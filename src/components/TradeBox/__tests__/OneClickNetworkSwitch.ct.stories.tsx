import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { AES } from "crypto-js";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { createConfig, http, useAccount, useConnect, useSwitchChain, WagmiProvider } from "wagmi";
import { arbitrum, base } from "wagmi/chains";
import { mock } from "wagmi/connectors";
import "react-toastify/dist/ReactToastify.css";

import { ARBITRUM, SOURCE_BASE_MAINNET } from "config/chains";
import {
  getExpressOrdersEnabledKey,
  getSubaccountApprovalKey,
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
import { serializeSubaccountApproval } from "domain/synthetics/subaccount/subaccountApprovalStorage";
import { MOCK_ACCOUNT, mockQueryClient as queryClient } from "domain/testUtils/mockSyntheticsState";
import { MockSyntheticsStateProvider } from "domain/testUtils/MockSyntheticsStateProvider";
import { useChainId } from "lib/chains";
import { getContract } from "sdk/configs/contracts";
import { SUBACCOUNT_ORDER_ACTION } from "sdk/configs/dataStore";
import type { SignedSubaccountApproval } from "sdk/utils/subaccount";

import { TradeBox } from "components/TradeBox/TradeBox";

const INITIAL_ENTRIES = ["/trade"];
const EXPRESS_AVAILABLE_FEATURES = { relayRouterEnabled: true, subaccountRelayRouterEnabled: true };
const SPONSORED_CALL_ALLOWED = { isSponsoredCallAllowed: true };

const multichainWagmiConfig = createConfig({
  chains: [arbitrum, base],
  transports: { [arbitrum.id]: http(), [base.id]: http() },
  connectors: [mock({ accounts: [MOCK_ACCOUNT] })],
});

function AutoConnect({ children }: { children: ReactNode }) {
  const { connect, connectors } = useConnect();
  const { status } = useAccount();

  useEffect(() => {
    if (status === "disconnected") {
      connect({ connector: connectors[0] });
    }
  }, [status, connect, connectors]);

  if (status !== "connected") {
    return null;
  }

  return <>{children}</>;
}

function NetworkSwitchControl() {
  const { switchChainAsync } = useSwitchChain();

  const switchToBase = useCallback(async () => {
    await switchChainAsync({ chainId: SOURCE_BASE_MAINNET });
    localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, String(SOURCE_BASE_MAINNET));
    localStorage.setItem(SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY, "true");
    document.dispatchEvent(new CustomEvent("networkChange", { detail: { chainId: SOURCE_BASE_MAINNET } }));
  }, [switchChainAsync]);

  return (
    <button type="button" data-qa="switch-to-base" onClick={switchToBase}>
      Switch to Base
    </button>
  );
}

function SyntheticsStateWithAppChainContext({ children }: { children: ReactNode }) {
  const { srcChainId } = useChainId();

  return (
    <MockSyntheticsStateProvider
      features={EXPRESS_AVAILABLE_FEATURES}
      sponsoredCallBalanceData={SPONSORED_CALL_ALLOWED}
      srcChainId={srcChainId}
    >
      {children}
    </MockSyntheticsStateProvider>
  );
}

export type OneClickNetworkSwitchStoryProps = {
  seedSubaccountAddress: string;
  seedSubaccountPrivateKey: string;
};

export function OneClickNetworkSwitchStory({
  seedSubaccountAddress,
  seedSubaccountPrivateKey,
}: OneClickNetworkSwitchStoryProps) {
  // eslint-disable-next-line react/hook-use-state
  useState(() => {
    localStorage.setItem(JSON.stringify(getExpressOrdersEnabledKey(ARBITRUM, MOCK_ACCOUNT)), "true");

    const encryptedPrivateKey = AES.encrypt(seedSubaccountPrivateKey, MOCK_ACCOUNT).toString();
    localStorage.setItem(
      JSON.stringify(getSubaccountConfigKey(ARBITRUM, MOCK_ACCOUNT)),
      JSON.stringify({ address: seedSubaccountAddress, privateKey: encryptedPrivateKey, isNew: true })
    );

    const settlementApproval: SignedSubaccountApproval = {
      subaccount: seedSubaccountAddress,
      shouldAdd: true,
      expiresAt: 9999999999n,
      maxAllowedCount: 10n,
      actionType: SUBACCOUNT_ORDER_ACTION,
      nonce: 0n,
      deadline: 9999999999n,
      desChainId: BigInt(ARBITRUM),
      signature: "0x01",
      signedAt: 1000,
      integrationId: "0x0000000000000000000000000000000000000000000000000000000000000000",
      subaccountRouterAddress: getContract(ARBITRUM, "SubaccountGelatoRelayRouter"),
      signatureChainId: ARBITRUM,
    };
    localStorage.setItem(
      JSON.stringify(getSubaccountApprovalKey(ARBITRUM, MOCK_ACCOUNT, undefined)),
      serializeSubaccountApproval(settlementApproval)
    );

    return true;
  });

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
                                    <AutoConnect>
                                      <SyntheticsStateWithAppChainContext>
                                        <NetworkSwitchControl />
                                        <div className="text-body-medium flex flex-col rounded-8">
                                          <TradeBox isMobile={false} />
                                        </div>
                                        <ToastContainer
                                          limit={1}
                                          position="bottom-right"
                                          hideProgressBar={true}
                                          newestOnTop={false}
                                          closeOnClick={false}
                                          draggable={false}
                                          icon={false}
                                        />
                                      </SyntheticsStateWithAppChainContext>
                                    </AutoConnect>
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
