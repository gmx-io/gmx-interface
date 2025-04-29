import { useCallback, useContext } from "react";
import { HeaderLink } from "./HeaderLink";

import "./Header.css";
import { isHomeSite } from "lib/legacy";
import cx from "classnames";
import { Trans } from "@lingui/macro";
import LanguagePopupHome from "../NetworkDropdown/LanguagePopupHome";
import {
  BLAST_SEPOLIA_TESTNET,
  OPTIMISM_GOERLI_TESTNET,
  OPTIMISM_MAINNET,
  SEPOLIA_TESTNET,
  MORPH_HOLESKY,
  getChainName,
  MORPH_MAINNET,
  BASE_MAINNET,
} from "config/chains";
import { switchNetwork } from "lib/wallets";
import { useDynamicChainId } from "lib/chains";
import { isDevelopment } from "config/env";
import { getIcon } from "config/icons";
import FaucetDropdown from "../FaucetDropdown/FaucetDropdown";
import SettingDropdown from "components/SettingDropdown/SettingDropdown";

import { DynamicWidget } from "@dynamic-labs/sdk-react-core";
import { DynamicWalletContext } from "store/dynamicwalletprovider";

type Props = {
  openSettings: () => void;
  small?: boolean;

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
  NETWORK_OPTIONS.push({
    label: getChainName(MORPH_HOLESKY),
    value: MORPH_HOLESKY,
    icon: getIcon(MORPH_HOLESKY, "network"),
    color: "#264f79",
  });
  NETWORK_OPTIONS.push({
    label: getChainName(MORPH_MAINNET),
    value: MORPH_MAINNET,
    icon: getIcon(MORPH_MAINNET, "network"),
    color: "#264f79",
  });
  NETWORK_OPTIONS.push({
    label: getChainName(BASE_MAINNET),
    value: BASE_MAINNET,
    icon: getIcon(BASE_MAINNET, "network"),
    color: "#2151f5",
  });
}

export function AppHeaderUser({
  openSettings,
  small,

  setApprovalsModalVisible,
  setDoesUserHaveEmail,
  disconnectAccountAndCloseSettings,
  redirectPopupTimestamp,
  showRedirectModal,
  activeModal,
  setActiveModal,
  setNewUser,
}: Props) {
  const { chainId } = useDynamicChainId();
  const dynamicContext = useContext(DynamicWalletContext);
  const active = dynamicContext.active;
  const account = dynamicContext.account;
  //const signer = dynamicContext.signer;
  //const { active, account } = useWeb3React();
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

  //const themeContext = useContext(ThemeContext);
  //const imgSrc = themeContext.theme === "light" ? connectWalletImgDrk : connectWalletImglight;

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
        {/* NOTE: Active dynamic wallet implementation Nov 2024 */}
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
            {/* <ConnectWalletButton
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
            /> */}
          </>
        ) : (
          <LanguagePopupHome />
        )}
      </div>
    );
  }

  return (
    <div className="App-header-user">
      {chainId === OPTIMISM_GOERLI_TESTNET ||
      chainId === SEPOLIA_TESTNET ||
      chainId === BLAST_SEPOLIA_TESTNET ||
      chainId === MORPH_HOLESKY ? (
        <div className="App-header-faucet">
          <FaucetDropdown />
        </div>
      ) : null}

      {showConnectionOptions ? (
        <>
          {/* <NetworkDropdown
            small={small}
            networkOptions={NETWORK_OPTIONS}
            selectorLabel={selectorLabel}
            onNetworkSelect={onNetworkSelect}
            openSettings={openSettings}
          /> */}
          <div>
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
