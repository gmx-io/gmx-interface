import { useWeb3React } from "@web3-react/core";
import AddressDropdown from "../AddressDropdown/AddressDropdown";
import ConnectWalletButton from "../Common/ConnectWalletButton";
import { useCallback, useContext } from "react";
import { HeaderLink } from "./HeaderLink";
import connectWalletImgDrk from "img/ic_wallet_24-dark.svg";
import connectWalletImglight from "img/ic_wallet_24-light.svg";
import "./Header.css";
import { isHomeSite, getAccountUrl } from "lib/legacy";
import cx from "classnames";
import { Trans } from "@lingui/macro";
import NetworkDropdown from "../NetworkDropdown/NetworkDropdown";
import LanguagePopupHome from "../NetworkDropdown/LanguagePopupHome";
import {
  BLAST_SEPOLIA_TESTNET,
  OPTIMISM_GOERLI_TESTNET,
  OPTIMISM_MAINNET,
  SEPOLIA_TESTNET,
  getChainName,
} from "config/chains";
import { switchNetwork } from "lib/wallets";
import { useChainId } from "lib/chains";
import { isDevelopment } from "config/env";
import { getIcon } from "config/icons";
import FaucetDropdown from "../FaucetDropdown/FaucetDropdown";
import SettingDropdown from "components/SettingDropdown/SettingDropdown";
import { ThemeContext } from "store/theme-provider";
import { DynamicWidget } from "@dynamic-labs/sdk-react-core";

type Props = {
  openSettings: () => void;
  small?: boolean;
  setWalletModalVisible: (visible: boolean) => void;
  setApprovalsModalVisible: (visible: boolean) => void;
  setDoesUserHaveEmail: (visible: boolean) => void;
  disconnectAccountAndCloseSettings: () => void;
  redirectPopupTimestamp: number;
  showRedirectModal: (to: string) => void;
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
  setNewUser: (status: boolean) => void;
};

const NETWORK_OPTIONS = [
  {
    label: getChainName(OPTIMISM_MAINNET),
    value: OPTIMISM_MAINNET,
    icon: getIcon(OPTIMISM_MAINNET, "network"),
    color: "#264f79",
  },
];

if (isDevelopment()) {
  NETWORK_OPTIONS.push({
    label: getChainName(SEPOLIA_TESTNET),
    value: SEPOLIA_TESTNET,
    icon: getIcon(SEPOLIA_TESTNET, "network"),
    color: "#264f79",
  });
  NETWORK_OPTIONS.push({
    label: getChainName(BLAST_SEPOLIA_TESTNET),
    value: BLAST_SEPOLIA_TESTNET,
    icon: getIcon(BLAST_SEPOLIA_TESTNET, "network"),
    color: "#264f79",
  });
}

export function AppHeaderUser({
  openSettings,
  small,
  setWalletModalVisible,
  setApprovalsModalVisible,
  setDoesUserHaveEmail,
  disconnectAccountAndCloseSettings,
  redirectPopupTimestamp,
  showRedirectModal,
  activeModal,
  setActiveModal,
  setNewUser,
}: Props) {
  const { chainId } = useChainId();
  const { active, account } = useWeb3React();
  const showConnectionOptions = !isHomeSite();

  const onNetworkSelect = useCallback(
    (option) => {
      if (option.value === chainId) {
        return;
      }
      return switchNetwork(option.value, active);
    },
    [chainId, active]
  );

  const selectorLabel = getChainName(chainId);

  const themeContext = useContext(ThemeContext);
  const imgSrc = themeContext.theme === "light" ? connectWalletImgDrk : connectWalletImglight;

  if (!active || !account) {
    return (
      <div className="App-header-user">
        <div id="App-header-trade" className={cx("App-header-trade-link", { "homepage-header": isHomeSite() })}>
          <HeaderLink
            className="default-btn"
            to="/trade"
            redirectPopupTimestamp={redirectPopupTimestamp}
            showRedirectModal={showRedirectModal}
          >
            {isHomeSite() ? <Trans>Launch App</Trans> : <Trans>Trade</Trans>}
          </HeaderLink>
        </div>
        <DynamicWidget
          variant="modal"
          buttonClassName="connect-wallet-btn-dynamic"
          buttonContainerClassName="connect-wallet-btn"
          innerButtonComponent={
            <button className="connect-wallet-btn">
              {/* {imgSrc && <img className="btn-icon" src={imgSrc} alt="Connect Wallet" />} */}
              <span className="btn-label">
                <Trans>Connect Wallet</Trans>
              </span>
            </button>
          }
        />
        {showConnectionOptions ? (
          <>
            <ConnectWalletButton
              onClick={() => setWalletModalVisible(true)}
              imgSrc={themeContext.theme === "light" ? connectWalletImgDrk : connectWalletImglight}
            >
              {small ? <Trans>Connect</Trans> : <Trans>Connect Wallet</Trans>}
            </ConnectWalletButton>
            <NetworkDropdown
              small={small}
              networkOptions={NETWORK_OPTIONS}
              selectorLabel={selectorLabel}
              onNetworkSelect={onNetworkSelect}
              openSettings={openSettings}
              setApprovalsModalVisible={setApprovalsModalVisible}
            />
          </>
        ) : (
          <LanguagePopupHome />
        )}
      </div>
    );
  }

  const accountUrl = getAccountUrl(chainId, account);

  return (
    <div className="App-header-user">
      {chainId === OPTIMISM_GOERLI_TESTNET || chainId === SEPOLIA_TESTNET || chainId === BLAST_SEPOLIA_TESTNET ? (
        <div className="App-header-faucet">
          <FaucetDropdown />
        </div>
      ) : null}

      {showConnectionOptions ? (
        <>
          <NetworkDropdown
            small={small}
            networkOptions={NETWORK_OPTIONS}
            selectorLabel={selectorLabel}
            onNetworkSelect={onNetworkSelect}
            openSettings={openSettings}
          />
          <div className="App-header-user-address">
            <AddressDropdown
              account={account}
              accountUrl={accountUrl}
              disconnectAccountAndCloseSettings={disconnectAccountAndCloseSettings}
            />
          </div>
          <SettingDropdown
            small={small}
            networkOptions={NETWORK_OPTIONS}
            selectorLabel={selectorLabel}
            onNetworkSelect={onNetworkSelect}
            openSettings={openSettings}
            activeModal={activeModal}
            setActiveModal={setActiveModal}
          />
        </>
      ) : (
        <LanguagePopupHome />
      )}
    </div>
  );
}
