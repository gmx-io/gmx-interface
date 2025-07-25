import { Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, getChainName } from "config/chains";
import { isDevelopment } from "config/env";
import { getIcon } from "config/icons";
import { useChainId } from "lib/chains";
import { getAccountUrl } from "lib/legacy";
import { useNotifyModalState } from "lib/useNotifyModalState";
import { sendUserAnalyticsConnectWalletClickEvent } from "lib/userAnalytics";
import useWallet from "lib/wallets/useWallet";

import Button from "components/Button/Button";

import BellIcon from "img/new-bell.svg?react";

import AddressDropdown from "../AddressDropdown/AddressDropdown";
import ConnectWalletButton from "../Common/ConnectWalletButton";
import NetworkDropdown from "../NetworkDropdown/NetworkDropdown";

type Props = {
  openSettings: () => void;
  disconnectAccountAndCloseSettings: () => void;
  menuToggle?: React.ReactNode;
};

const NETWORK_OPTIONS = [
  {
    label: getChainName(ARBITRUM),
    value: ARBITRUM,
    icon: getIcon(ARBITRUM, "network"),
    color: "#264f79",
  },
  {
    label: getChainName(AVALANCHE),
    value: AVALANCHE,
    icon: getIcon(AVALANCHE, "network"),
    color: "#E841424D",
  },
];

if (isDevelopment()) {
  NETWORK_OPTIONS.push({
    label: getChainName(AVALANCHE_FUJI),
    value: AVALANCHE_FUJI,
    icon: getIcon(AVALANCHE_FUJI, "network"),
    color: "#E841424D",
  });
}

export function AppHeaderUser({ openSettings, disconnectAccountAndCloseSettings, menuToggle }: Props) {
  const { chainId } = useChainId();
  const { active, account } = useWallet();
  const { openConnectModal } = useConnectModal();

  const selectorLabel = getChainName(chainId);

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
              <Trans>Connect Wallet</Trans>
            </ConnectWalletButton>
            <NotifyButton />
            <NetworkDropdown
              networkOptions={NETWORK_OPTIONS}
              selectorLabel={selectorLabel}
              openSettings={openSettings}
            />
            {menuToggle ? menuToggle : null}
          </>
        ) : null}
      </div>
    );
  }

  const accountUrl = getAccountUrl(chainId, account);

  return (
    <div className="flex items-center gap-8">
      <div data-qa="user-address">
        <AddressDropdown
          account={account}
          accountUrl={accountUrl}
          disconnectAccountAndCloseSettings={disconnectAccountAndCloseSettings}
        />
      </div>
      <NotifyButton />
      <NetworkDropdown networkOptions={NETWORK_OPTIONS} selectorLabel={selectorLabel} openSettings={openSettings} />
      {menuToggle ? menuToggle : null}
    </div>
  );
}

const NotifyButton = () => {
  const { openNotifyModal } = useNotifyModalState();

  return (
    <Button variant="secondary" onClick={openNotifyModal}>
      <BellIcon width={20} height={20} className="box-content p-2" />
    </Button>
  );
};
