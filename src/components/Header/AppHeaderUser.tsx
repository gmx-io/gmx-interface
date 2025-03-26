import { Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import cx from "classnames";

import { useCallback } from "react";
import { useRouteMatch } from "react-router-dom";

import connectWalletImg from "img/ic_wallet_24.svg";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, getChainName } from "config/chains";
import { isDevelopment } from "config/env";
import { getIcon } from "config/icons";

import { useChainId } from "lib/chains";
import { isHomeSite, shouldShowRedirectModal } from "lib/legacy";
import { useRedirectPopupTimestamp } from "lib/useRedirectPopupTimestamp";
import { useTradePageVersion } from "lib/useTradePageVersion";
import { sendUserAnalyticsConnectWalletClickEvent, userAnalytics } from "lib/userAnalytics";
import { LandingPageLaunchAppEvent } from "lib/userAnalytics/types";
import useWallet from "lib/wallets/useWallet";

import AddressDropdown from "../AddressDropdown/AddressDropdown";
import ConnectWalletButton from "../Common/ConnectWalletButton";
import LanguagePopupHome from "../NetworkDropdown/LanguagePopupHome";
import NetworkDropdown from "../NetworkDropdown/NetworkDropdown";
import { NotifyButton } from "../NotifyButton/NotifyButton";
import { HeaderLink } from "./HeaderLink";

import "./Header.scss";

type Props = {
  openSettings: () => void;
  small?: boolean;
  showRedirectModal: (to: string) => void;
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

export function AppHeaderUser({
  small,
  menuToggle,
  openSettings,

  showRedirectModal,
}: Props) {
  const { chainId } = useChainId();
  const { active, account } = useWallet();
  const { openConnectModal } = useConnectModal();
  const showConnectionOptions = !isHomeSite();
  const [tradePageVersion] = useTradePageVersion();
  const [redirectPopupTimestamp] = useRedirectPopupTimestamp();

  const tradeLink = tradePageVersion === 2 ? "/trade" : "/v1";
  const isOnTradePageV1 = useRouteMatch("/v1");
  const isOnTradePageV2 = useRouteMatch("/trade");
  const shouldHideTradeButton = isOnTradePageV1 || isOnTradePageV2;

  const selectorLabel = getChainName(chainId);

  const trackLaunchApp = useCallback(() => {
    userAnalytics.pushEvent<LandingPageLaunchAppEvent>(
      {
        event: "LandingPageAction",
        data: {
          action: "LaunchApp",
          buttonPosition: "StickyHeader",
          shouldSeeConfirmationDialog: shouldShowRedirectModal(redirectPopupTimestamp),
        },
      },
      { instantSend: true }
    );
  }, [redirectPopupTimestamp]);

  if (!active || !account) {
    return (
      <div className="App-header-user">
        {shouldHideTradeButton ? null : (
          <div
            data-qa="trade"
            className={cx("App-header-trade-link text-body-medium", { "homepage-header": isHomeSite() })}
          >
            <HeaderLink
              className="default-btn"
              onClick={trackLaunchApp}
              to={`${tradeLink}?${isHomeSite() ? userAnalytics.getSessionIdUrlParams() : ""}`}
              showRedirectModal={showRedirectModal}
            >
              {isHomeSite() ? <Trans>Launch App</Trans> : <Trans>Trade</Trans>}
            </HeaderLink>
          </div>
        )}

        {showConnectionOptions && openConnectModal ? (
          <>
            <ConnectWalletButton
              onClick={() => {
                sendUserAnalyticsConnectWalletClickEvent("Header");
                openConnectModal();
              }}
              imgSrc={connectWalletImg}
            >
              {small ? <Trans>Connect</Trans> : <Trans>Connect Wallet</Trans>}
            </ConnectWalletButton>
            {!small && <NotifyButton />}
            <NetworkDropdown
              small={small}
              networkOptions={NETWORK_OPTIONS}
              selectorLabel={selectorLabel}
              openSettings={openSettings}
            />
          </>
        ) : (
          <LanguagePopupHome />
        )}
        {menuToggle}
      </div>
    );
  }

  return (
    <div className="App-header-user">
      <div data-qa="trade" className="App-header-trade-link text-body-medium">
        {shouldHideTradeButton ? null : (
          <HeaderLink
            className="default-btn"
            onClick={trackLaunchApp}
            to={`${tradeLink}?${isHomeSite() ? userAnalytics.getSessionIdUrlParams() : ""}`}
            showRedirectModal={showRedirectModal}
          >
            {isHomeSite() ? <Trans>Launch App</Trans> : <Trans>Trade</Trans>}
          </HeaderLink>
        )}
      </div>

      {showConnectionOptions ? (
        <>
          <div data-qa="user-address" className="App-header-user-address">
            <AddressDropdown account={account} />
          </div>
          {!small && <NotifyButton />}
          <NetworkDropdown
            small={small}
            networkOptions={NETWORK_OPTIONS}
            selectorLabel={selectorLabel}
            openSettings={openSettings}
          />
        </>
      ) : (
        <LanguagePopupHome />
      )}
      {menuToggle}
    </div>
  );
}
