import { Trans } from "@lingui/macro";

import { NETWORK_OPTIONS } from "config/networkOptions";
import { useChainId } from "lib/chains";
import { sendUserAnalyticsConnectWalletClickEvent } from "lib/userAnalytics";
import { useConnectModal } from "lib/wallets/useConnectModal";
import useWallet from "lib/wallets/useWallet";

import Button from "components/Button/Button";
import { OneClickButton } from "components/OneClickButton/OneClickButton";

import SpinnerIcon from "img/ic_spinner.svg?react";

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
  const { isConnectModalLoading, openConnectModal } = useConnectModal();

  const visualChainId = srcChainId ?? settlementChainId;

  if (active && account) {
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

  if (isConnectModalLoading) {
    return (
      <div className="flex items-center gap-8">
        <div data-qa="user-address">
          <Button
            variant="secondary"
            size="controlled"
            className="flex h-40 items-center gap-8 px-15 pr-12 max-md:h-32"
            disabled
            aria-live="polite"
          >
            <SpinnerIcon className="size-16 animate-spin" />
            <span className="text-body-medium font-medium text-typography-primary">
              <Trans>Loading...</Trans>
            </span>
          </Button>
        </div>
        <OneClickButton openSettings={openSettings} />
        <NetworkDropdown chainId={visualChainId} networkOptions={NETWORK_OPTIONS} />
        {menuToggle ? menuToggle : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-8">
      {openConnectModal ? (
        <>
          <ConnectWalletButton
            disabled={isConnectModalLoading}
            onClick={() => {
              sendUserAnalyticsConnectWalletClickEvent("Header");
              openConnectModal();
            }}
          >
            {isConnectModalLoading ? <Trans>Loading...</Trans> : <Trans>Connect wallet</Trans>}
          </ConnectWalletButton>
          <OneClickButton openSettings={openSettings} />
          <NetworkDropdown chainId={visualChainId} networkOptions={NETWORK_OPTIONS} />
          {menuToggle ? menuToggle : null}
        </>
      ) : null}
    </div>
  );
}
