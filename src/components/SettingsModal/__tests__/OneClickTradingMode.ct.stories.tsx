import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { AES } from "crypto-js";
import { ReactNode, useEffect, useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAccount, useConnect, WagmiProvider } from "wagmi";

import { ARBITRUM } from "config/chains";
import { getExpressOrdersEnabledKey, getSubaccountApprovalKey, getSubaccountConfigKey } from "config/localStorage";
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
import {
  MOCK_ACCOUNT,
  mockQueryClient as queryClient,
  mockWagmiConfig as wagmiConfig,
} from "domain/testUtils/mockSyntheticsState";
import { MockSyntheticsStateProvider } from "domain/testUtils/MockSyntheticsStateProvider";
import { getContract } from "sdk/configs/contracts";
import { SUBACCOUNT_ORDER_ACTION } from "sdk/configs/dataStore";
import type { SignedSubaccountApproval } from "sdk/utils/subaccount";

import { SettingsModal } from "components/SettingsModal/SettingsModal";

const INITIAL_ENTRIES = ["/trade"];

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

export type OneClickTradingModeStoryProps = {
  expressEnabled?: boolean;
  seedSubaccountAddress?: string;
  seedSubaccountPrivateKey?: string;
  seedSettlementApproval?: boolean;
};

export function OneClickTradingModeStory({
  expressEnabled = false,
  seedSubaccountAddress,
  seedSubaccountPrivateKey,
  seedSettlementApproval = false,
}: OneClickTradingModeStoryProps) {
  // eslint-disable-next-line react/hook-use-state
  useState(() => {
    if (expressEnabled) {
      localStorage.setItem(JSON.stringify(getExpressOrdersEnabledKey(ARBITRUM, MOCK_ACCOUNT)), "true");
    }

    if (seedSubaccountAddress && seedSubaccountPrivateKey) {
      const encryptedPrivateKey = AES.encrypt(seedSubaccountPrivateKey, MOCK_ACCOUNT).toString();
      localStorage.setItem(
        JSON.stringify(getSubaccountConfigKey(ARBITRUM, MOCK_ACCOUNT)),
        JSON.stringify({ address: seedSubaccountAddress, privateKey: encryptedPrivateKey, isNew: true })
      );

      if (seedSettlementApproval) {
        const approval: SignedSubaccountApproval = {
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
          serializeSubaccountApproval(approval)
        );
      }
    }

    return true;
  });

  const [isSettingsVisible, setIsSettingsVisible] = useState(true);

  return (
    <MemoryRouter initialEntries={INITIAL_ENTRIES}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
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
                                  <SorterContextProvider>
                                    <AutoConnect>
                                      <MockSyntheticsStateProvider>
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
                                      </MockSyntheticsStateProvider>
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
