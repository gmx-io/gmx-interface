import { useWeb3React } from "@web3-react/core";
import AddressDropdown from "components/AddressDropdown/AddressDropdown";
import { ConnectWalletButton } from "components/Common/Button";
import NetworkSelector from "components/NetworkSelector/NetworkSelector";
import { ARBITRUM, AVALANCHE, getAccountUrl, getChainName, isHomeSite, switchNetwork, useChainId } from "Helpers";
import { useCallback, useEffect } from "react";
import { HeaderLink } from "./HeaderLink";
import connectWalletImg from "img/ic_wallet_24.svg";

import "./Header.css";

type Props = {
  openSettings: () => void;
  small?: boolean;
  setWalletModalVisible: (visible: boolean) => void;
  showNetworkSelectorModal: (visible: boolean) => void;
  disconnectAccountAndCloseSettings: () => void;
};

export function AppHeaderUser({
  openSettings,
  small,
  setWalletModalVisible,
  showNetworkSelectorModal,
  disconnectAccountAndCloseSettings,
}: Props) {
  const { chainId } = useChainId();

  const { active, account } = useWeb3React();
  const showConnectionOptions = !isHomeSite();

  const networkOptions = [
    {
      label: "Arbitrum",
      value: ARBITRUM,
      icon: "ic_arbitrum_24.svg",
      color: "#264f79",
    },
    {
      label: "Avalanche",
      value: AVALANCHE,
      icon: "ic_avalanche_24.svg",
      color: "#E841424D",
    },
  ];

  useEffect(() => {
    if (active) {
      setWalletModalVisible(false);
    }
  }, [active, setWalletModalVisible]);

  const onNetworkSelect = useCallback(
    (option: { value: number }) => {
      if (option.value === chainId) {
        return;
      }
      return switchNetwork(option.value, active);
    },
    [chainId, active]
  );

  const selectorLabel = getChainName(chainId);

  if (!active) {
    return (
      <div className="App-header-user">
        <div className="App-header-user-link">
          <HeaderLink className="default-btn" to="/trade">
            Trade
          </HeaderLink>
        </div>
        {showConnectionOptions && (
          <NetworkSelector
            options={networkOptions}
            label={selectorLabel}
            onSelect={onNetworkSelect}
            className="App-header-user-netowork"
            showCaret={true}
            modalLabel="Select Network"
            small={small}
            showModal={showNetworkSelectorModal}
          />
        )}
        {showConnectionOptions && (
          <ConnectWalletButton onClick={() => setWalletModalVisible(true)} imgSrc={connectWalletImg}>
            {small ? "Connect" : "Connect Wallet"}
          </ConnectWalletButton>
        )}
      </div>
    );
  }

  const accountUrl = getAccountUrl(chainId, account);

  return (
    <div className="App-header-user">
      <div className="App-header-user-link">
        <HeaderLink className="default-btn" to="/trade">
          Trade
        </HeaderLink>
      </div>
      {showConnectionOptions && (
        <NetworkSelector
          options={networkOptions}
          label={selectorLabel}
          onSelect={onNetworkSelect}
          className="App-header-user-netowork"
          showCaret={true}
          modalLabel="Select Network"
          small={small}
          showModal={showNetworkSelectorModal}
        />
      )}
      {showConnectionOptions && (
        <div className="App-header-user-address">
          <AddressDropdown
            account={account}
            accountUrl={accountUrl}
            disconnectAccountAndCloseSettings={disconnectAccountAndCloseSettings}
            openSettings={openSettings}
          />
        </div>
      )}
    </div>
  );
}
