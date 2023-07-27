import { useWeb3React } from "@web3-react/core";
import AddressDropdown from "../AddressDropdown/AddressDropdown";
import ConnectWalletButton from "../Common/ConnectWalletButton";
import React, { useCallback, useEffect } from "react";
import { HeaderLink } from "./HeaderLink";
import connectWalletImg from "img/ic_wallet_24.svg";

import "./Header.css";
import { isHomeSite, getAccountUrl } from "lib/legacy";
import cx from "classnames";
import { Trans } from "@lingui/macro";
import NetworkDropdown from "../NetworkDropdown/NetworkDropdown";
import LanguagePopupHome from "../NetworkDropdown/LanguagePopupHome";
import { ARBITRUM, SEPOLIA_TESTNET, getChainName } from "config/chains";
import { switchNetwork } from "lib/wallets";
import { useChainId } from "lib/chains";
import { isDevelopment } from "config/env";
import { getIcon } from "config/icons";
import { addUser, getUserByWalletAddress } from "external/supabase/supabaseFns";

type Props = {
  openSettings: () => void;
  small?: boolean;
  setWalletModalVisible: (visible: boolean) => void;
  setDoesUserHaveEmail: (visible: boolean) => void;
  disconnectAccountAndCloseSettings: () => void;
  redirectPopupTimestamp: number;
  showRedirectModal: (to: string) => void;
};

const NETWORK_OPTIONS = [
  {
    label: getChainName(ARBITRUM),
    value: ARBITRUM,
    icon: getIcon(ARBITRUM, "network"),
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
}

export function AppHeaderUser({
  openSettings,
  small,
  setWalletModalVisible,
  setDoesUserHaveEmail,
  disconnectAccountAndCloseSettings,
  redirectPopupTimestamp,
  showRedirectModal,
}: Props) {
  const { chainId } = useChainId();
  const { active, account } = useWeb3React();
  const showConnectionOptions = !isHomeSite();

  useEffect(() => {
    if (active && account) {
      // check that user is active and account is successfully signed up
      const checkAndCreateUser = async () => {
        const user = await getUserByWalletAddress(account);

        if (user) {
          // User exists, check if email_address is present
          if (user.email_address) {
            setDoesUserHaveEmail(true);
          }
        } else {
          const newUser = await addUser(account);
          // eslint-disable-next-line no-console
          console.log("New user added:", newUser);
        }
      };

      checkAndCreateUser();
    }
  }, [account, active, setDoesUserHaveEmail, setWalletModalVisible]);

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

  if (!active || !account) {
    return (
      <div className="App-header-user">
        <div className={cx("App-header-trade-link", { "homepage-header": isHomeSite() })}>
          <HeaderLink
            className="default-btn"
            to="/trade"
            redirectPopupTimestamp={redirectPopupTimestamp}
            showRedirectModal={showRedirectModal}
          >
            {isHomeSite() ? <Trans>Launch App</Trans> : <Trans>Trade</Trans>}
          </HeaderLink>
        </div>

        {showConnectionOptions ? (
          <>
            <ConnectWalletButton onClick={() => setWalletModalVisible(true)} imgSrc={connectWalletImg}>
              {small ? <Trans>Connect</Trans> : <Trans>Connect Wallet</Trans>}
            </ConnectWalletButton>
            <NetworkDropdown
              small={small}
              networkOptions={NETWORK_OPTIONS}
              selectorLabel={selectorLabel}
              onNetworkSelect={onNetworkSelect}
              openSettings={openSettings}
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
      {chainId === SEPOLIA_TESTNET && (
        <div className="App-header-trade-link">
          <a href={`http://t3-finance-faucet.s3-website.us-east-2.amazonaws.com/`} target="_blank" rel="noreferrer">
            <button className="default-btn">{`Faucet`}</button>
          </a>
        </div>
      )}

      {showConnectionOptions ? (
        <>
          <div className="App-header-user-address">
            <AddressDropdown
              account={account}
              accountUrl={accountUrl}
              disconnectAccountAndCloseSettings={disconnectAccountAndCloseSettings}
            />
          </div>
          <NetworkDropdown
            small={small}
            networkOptions={NETWORK_OPTIONS}
            selectorLabel={selectorLabel}
            onNetworkSelect={onNetworkSelect}
            openSettings={openSettings}
          />
        </>
      ) : (
        <LanguagePopupHome />
      )}
    </div>
  );
}
