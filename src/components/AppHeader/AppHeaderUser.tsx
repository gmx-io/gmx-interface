import { Trans } from "@lingui/macro";

import { isSolanaNetwork } from "config/chains";
import { NETWORK_OPTIONS } from "config/networkOptions";
import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { useChainId } from "lib/chains";
import { sendUserAnalyticsConnectWalletClickEvent } from "lib/userAnalytics";
import { useSolanaWalletSession } from "lib/wallets/solanaWalletSession";
import { useIsWalletInitializing } from "lib/wallets/useIsWalletInitializing";
import useWallet from "lib/wallets/useWallet";

import { SettingsButton } from "components/SettingsButton/SettingsButton";

import { AddressDropdown } from "../AddressDropdown/AddressDropdown";
import ConnectWalletButton from "../ConnectWalletButton/ConnectWalletButton";
import ConnectWalletPlaceholder from "../ConnectWalletButton/ConnectWalletPlaceholder";
import NetworkDropdown from "../NetworkDropdown/NetworkDropdown";

type Props = {
  openSettings: () => void;
  menuToggle?: React.ReactNode;
};

export function AppHeaderUser({ openSettings, menuToggle }: Props) {
  const { chainId: settlementChainId, srcChainId, networkId } = useChainId();
  const { active, account } = useWallet();
  const isWalletInitializing = useIsWalletInitializing();
  const { openConnectModal } = useConnectModal();
  const solanaWallet = useSolanaWalletSession();

  const visualChainId = srcChainId ?? settlementChainId;
  const isSolanaSelected = isSolanaNetwork(networkId);
  // While Solana is selected the header shows the Solana wallet in place of the EVM account.
  const addressDropdown = isSolanaSelected
    ? solanaWallet.address && solanaWallet.disconnect && <AddressDropdown account={solanaWallet.address} />
    : active && account && <AddressDropdown account={account} />;

  const showConnectPlaceholder =
    (isWalletInitializing && !isSolanaSelected) || (isSolanaSelected && solanaWallet.isRestoring);

  if (!addressDropdown) {
    return (
      <div className="flex items-center gap-8">
        {showConnectPlaceholder ? (
          <ConnectWalletPlaceholder />
        ) : (
          <ConnectWalletButton
            onClick={() => {
              if (!isSolanaSelected) {
                sendUserAnalyticsConnectWalletClickEvent("Header");
              }
              openConnectModal?.();
            }}
          >
            <Trans>Connect wallet</Trans>
          </ConnectWalletButton>
        )}
        <SettingsButton openSettings={openSettings} />
        <NetworkDropdown chainId={visualChainId} networkOptions={NETWORK_OPTIONS} />
        {menuToggle ? menuToggle : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-8">
      <div data-qa="user-address">{addressDropdown}</div>
      <SettingsButton openSettings={openSettings} />
      <NetworkDropdown chainId={visualChainId} networkOptions={NETWORK_OPTIONS} />
      {menuToggle ? menuToggle : null}
    </div>
  );
}
