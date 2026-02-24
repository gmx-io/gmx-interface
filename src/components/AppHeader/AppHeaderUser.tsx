import { Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";

import { NETWORK_OPTIONS } from "config/networkOptions";
import { useChainId } from "lib/chains";
import { sendUserAnalyticsConnectWalletClickEvent } from "lib/userAnalytics";
import useWallet from "lib/wallets/useWallet";

import { OneClickButton } from "components/OneClickButton/OneClickButton";

import { AddressDropdown } from "../AddressDropdown/AddressDropdown";
import ConnectWalletButton from "../ConnectWalletButton/ConnectWalletButton";
import NetworkDropdown from "../NetworkDropdown/NetworkDropdown";

type Props = {
  openSettings: () => void;
  menuToggle?: React.ReactNode;
};

export function AppHeaderUser({ openSettings, menuToggle }: Props) {
  const { chainId: settlementChainId, srcChainId } = useChainId();
  const { active, account } = useWallet();
  const { openConnectModal } = useConnectModal();

  const visualChainId = srcChainId ?? settlementChainId;

  if (!active || !account) {
    return (
      <div className="flex items-center gap-8">
        <ConnectWalletButton
          onClick={() => {
            sendUserAnalyticsConnectWalletClickEvent("Header");
            openConnectModal?.();
          }}
        >
          <Trans>Connect wallet</Trans>
        </ConnectWalletButton>
        <OneClickButton openSettings={openSettings} />
        <NetworkDropdown chainId={visualChainId} networkOptions={NETWORK_OPTIONS} />
        {menuToggle ? menuToggle : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-8">
      <div data-qa="user-address">
        <AddressDropdown account={account} />
      </div>
      <OneClickButton openSettings={openSettings} />
      <NetworkDropdown chainId={visualChainId} networkOptions={NETWORK_OPTIONS} />
      {menuToggle ? menuToggle : null}
    </div>
  );
}
