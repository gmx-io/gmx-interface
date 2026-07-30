import { AES } from "crypto-js";
import { ReactNode, useMemo, useState } from "react";

import { ARBITRUM, SOURCE_BASE_MAINNET } from "config/chains";
import {
  getExpressOrdersEnabledKey,
  getGmxAccountGasPaymentTokenAddressKey,
  getSubaccountConfigKey,
  SELECTED_NETWORK_LOCAL_STORAGE_KEY,
  SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY,
} from "config/localStorage";
import { CtAppProviders } from "domain/testUtils/CtAppProviders";
import { MOCK_L1_EXPRESS_ORDER_GAS_REFERENCE } from "domain/testUtils/mockChainData";
import { MOCK_ACCOUNT, mockMultichainWagmiConfig } from "domain/testUtils/mockSyntheticsState";
import { MockSyntheticsStateProvider, DEFAULT_MOCK_TOKENS_DATA } from "domain/testUtils/MockSyntheticsStateProvider";
import { ETH_ADDRESS, ETH_TOKEN } from "domain/testUtils/mockTokens";
import { useChainId } from "lib/chains";
import { expandDecimals } from "lib/numbers";

import { SettingsModal } from "components/SettingsModal/SettingsModal";

const EXPRESS_AVAILABLE_FEATURES = { relayRouterEnabled: true, subaccountRelayRouterEnabled: true };
const SPONSORED_CALL_ALLOWED = { isSponsoredCallAllowed: true };

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
    <CtAppProviders wagmiConfig={mockMultichainWagmiConfig} connectChainId={SOURCE_BASE_MAINNET}>
      <MultichainSyntheticsState>
        <SettingsModal isSettingsVisible={isSettingsVisible} setIsSettingsVisible={setIsSettingsVisible} />
      </MultichainSyntheticsState>
    </CtAppProviders>
  );
}
