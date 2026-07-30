import { AES } from "crypto-js";
import { useState } from "react";

import { ARBITRUM } from "config/chains";
import { getExpressOrdersEnabledKey, getSubaccountApprovalKey, getSubaccountConfigKey } from "config/localStorage";
import { serializeSubaccountApproval } from "domain/synthetics/subaccount/subaccountApprovalStorage";
import { CtAppProviders } from "domain/testUtils/CtAppProviders";
import { MOCK_ACCOUNT, mockWagmiConfig } from "domain/testUtils/mockSyntheticsState";
import { MockSyntheticsStateProvider } from "domain/testUtils/MockSyntheticsStateProvider";
import { getContract } from "sdk/configs/contracts";
import { SUBACCOUNT_ORDER_ACTION } from "sdk/configs/dataStore";
import type { SignedSubaccountApproval } from "sdk/utils/subaccount";

import { SettingsModal } from "components/SettingsModal/SettingsModal";

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
    <CtAppProviders wagmiConfig={mockWagmiConfig}>
      <MockSyntheticsStateProvider>
        <SettingsModal isSettingsVisible={isSettingsVisible} setIsSettingsVisible={setIsSettingsVisible} />
      </MockSyntheticsStateProvider>
    </CtAppProviders>
  );
}
