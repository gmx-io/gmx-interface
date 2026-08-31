import { AES } from "crypto-js";
import { ReactNode, useCallback, useState } from "react";
import { useSwitchChain } from "wagmi";

import { ARBITRUM, SOURCE_BASE_MAINNET } from "config/chains";
import {
  getExpressOrdersEnabledKey,
  getSubaccountApprovalKey,
  getSubaccountConfigKey,
  SELECTED_NETWORK_LOCAL_STORAGE_KEY,
  SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY,
} from "config/localStorage";
import { serializeSubaccountApproval } from "domain/synthetics/subaccount/subaccountApprovalStorage";
import { CtAppProviders } from "domain/testUtils/CtAppProviders";
import { MOCK_ACCOUNT, mockMultichainWagmiConfig } from "domain/testUtils/mockSyntheticsState";
import { MockSyntheticsStateProvider } from "domain/testUtils/MockSyntheticsStateProvider";
import { useChainId } from "lib/chains";
import { getContract } from "sdk/configs/contracts";
import { SUBACCOUNT_ORDER_ACTION } from "sdk/configs/dataStore";
import type { SignedSubaccountApproval } from "sdk/utils/subaccount";

import { TradeBox } from "components/TradeBox/TradeBox";

const EXPRESS_AVAILABLE_FEATURES = { relayRouterEnabled: true, subaccountRelayRouterEnabled: true };
const SPONSORED_CALL_ALLOWED = { isSponsoredCallAllowed: true };

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
    <CtAppProviders wagmiConfig={mockMultichainWagmiConfig}>
      <SyntheticsStateWithAppChainContext>
        <NetworkSwitchControl />
        <div className="text-body-medium flex flex-col rounded-8">
          <TradeBox isMobile={false} />
        </div>
      </SyntheticsStateWithAppChainContext>
    </CtAppProviders>
  );
}
