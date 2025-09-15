import { Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";

import { useChainId } from "lib/chains";
import { sendUserAnalyticsConnectWalletClickEvent } from "lib/userAnalytics";
import useWallet from "lib/wallets/useWallet";

import { NETWORK_OPTIONS } from "components/Header/AppHeaderChainAndSettings";
import { OneClickButton } from "components/OneClickButton/OneClickButton";

import { AddressDropdown } from "../AddressDropdown/AddressDropdown";
import ConnectWalletButton from "../Common/ConnectWalletButton";
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
        {openConnectModal ? (
          <>
            <ConnectWalletButton
              onClick={() => {
                sendUserAnalyticsConnectWalletClickEvent("Header");
                openConnectModal();
              }}
            >
              <Trans>Connect wallet</Trans>
            </ConnectWalletButton>
            <OneClickButton openSettings={openSettings} />
            <NetworkDropdown chainId={visualChainId} networkOptions={NETWORK_OPTIONS} openSettings={openSettings} />
            {menuToggle ? menuToggle : null}
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-8">
      <div data-qa="user-address">
        <AddressDropdown account={account} />
      </div>
      <OneClickButton openSettings={openSettings} />
      <NetworkDropdown chainId={visualChainId} networkOptions={NETWORK_OPTIONS} openSettings={openSettings} />
      {menuToggle ? menuToggle : null}
    </div>
  );
}
