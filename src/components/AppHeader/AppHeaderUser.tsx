import { Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, getChainName } from "config/chains";
import { isDevelopment } from "config/env";
import { getIcon } from "config/icons";
import { useChainId } from "lib/chains";
import { getAccountUrl } from "lib/legacy";
import { sendUserAnalyticsConnectWalletClickEvent } from "lib/userAnalytics";
import useWallet from "lib/wallets/useWallet";

import connectWalletImg from "img/ic_wallet_24.svg";

import AddressDropdown from "../AddressDropdown/AddressDropdown";
import ConnectWalletButton from "../Common/ConnectWalletButton";
import LanguagePopupHome from "../NetworkDropdown/LanguagePopupHome";
import NetworkDropdown from "../NetworkDropdown/NetworkDropdown";
import { NotifyButton } from "../NotifyButton/NotifyButton";

type Props = {
  openSettings: () => void;
  disconnectAccountAndCloseSettings: () => void;
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

export function AppHeaderUser({
  openSettings,
  disconnectAccountAndCloseSettings,
}: Props) {
  const { chainId } = useChainId();
  const { active, account } = useWallet();
  const { openConnectModal } = useConnectModal();

  const selectorLabel = getChainName(chainId);

  if (!active || !account) {
    return (
      <div className="">
        {openConnectModal ? (
          <>
            <ConnectWalletButton
              onClick={() => {
                sendUserAnalyticsConnectWalletClickEvent("Header");
                openConnectModal();
              }}
              imgSrc={connectWalletImg}
            >
              <Trans>Connect Wallet</Trans>
            </ConnectWalletButton>
            <NotifyButton />
            <NetworkDropdown
              networkOptions={NETWORK_OPTIONS}
              selectorLabel={selectorLabel}
              openSettings={openSettings}
            />
          </>
        ) : null}
      </div>
    );
  }

  const accountUrl = getAccountUrl(chainId, account);

  return (
    <div>
      <div data-qa="user-address">
        <AddressDropdown
          account={account}
          accountUrl={accountUrl}
          disconnectAccountAndCloseSettings={disconnectAccountAndCloseSettings}
        />
      </div>
      <NotifyButton />
      <NetworkDropdown
        networkOptions={NETWORK_OPTIONS}
        selectorLabel={selectorLabel}
        openSettings={openSettings}
      />
    </div>
  );
}
