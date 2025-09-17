import { Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useCallback } from "react";

import {
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  AVALANCHE_FUJI,
  BOTANIX,
  SOURCE_BASE_MAINNET,
  SOURCE_OPTIMISM_SEPOLIA,
  SOURCE_SEPOLIA,
  getChainName,
} from "config/chains";
import { isDevelopment } from "config/env";
import { getChainIcon } from "config/icons";
import { IS_SOURCE_BASE_ALLOWED } from "config/multichain";
import { useChainId } from "lib/chains";
import { isHomeSite, shouldShowRedirectModal } from "lib/legacy";
import { sendUserAnalyticsConnectWalletClickEvent, userAnalytics } from "lib/userAnalytics";
import { LandingPageLaunchAppEvent } from "lib/userAnalytics/types";
import { useRedirectPopupTimestamp } from "lib/useRedirectPopupTimestamp";
import { useTradePageVersion } from "lib/useTradePageVersion";
import useWallet from "lib/wallets/useWallet";

import { OneClickButton } from "components/OneClickButton/OneClickButton";

import { HeaderLink } from "./HeaderLink";
import { AddressDropdown } from "../AddressDropdown/AddressDropdown";
import ConnectWalletButton from "../ConnectWalletButton/ConnectWalletButton";
import LanguagePopupHome from "../NetworkDropdown/LanguagePopupHome";
import NetworkDropdown from "../NetworkDropdown/NetworkDropdown";

import "./Header.scss";

type Props = {
  openSettings: () => void;
  showRedirectModal: (to: string) => void;
  menuToggle?: React.ReactNode;
};

export type NetworkOption = {
  label: string;
  value: number;
  icon: string;
  color: string;
};

export const NETWORK_OPTIONS: NetworkOption[] = [
  {
    label: getChainName(ARBITRUM),
    value: ARBITRUM,
    icon: getChainIcon(ARBITRUM),
    color: "#264f79",
  },
  {
    label: getChainName(AVALANCHE),
    value: AVALANCHE,
    icon: getChainIcon(AVALANCHE),
    color: "#E841424D",
  },
  {
    label: getChainName(BOTANIX),
    value: BOTANIX,
    icon: getChainIcon(BOTANIX),
    color: "#F7931A",
  },
];

if (IS_SOURCE_BASE_ALLOWED) {
  NETWORK_OPTIONS.push({
    label: getChainName(SOURCE_BASE_MAINNET),
    value: SOURCE_BASE_MAINNET,
    icon: getChainIcon(SOURCE_BASE_MAINNET),
    color: "#0052ff",
  });
}

if (isDevelopment()) {
  NETWORK_OPTIONS.push(
    {
      label: getChainName(AVALANCHE_FUJI),
      value: AVALANCHE_FUJI,
      icon: getChainIcon(AVALANCHE_FUJI),
      color: "#E841424D",
    },
    {
      label: getChainName(ARBITRUM_SEPOLIA),
      value: ARBITRUM_SEPOLIA,
      icon: getChainIcon(ARBITRUM_SEPOLIA),
      color: "#0052ff",
    },
    {
      label: getChainName(SOURCE_OPTIMISM_SEPOLIA),
      value: SOURCE_OPTIMISM_SEPOLIA,
      icon: getChainIcon(SOURCE_OPTIMISM_SEPOLIA),
      color: "#ff0420",
    },
    {
      label: getChainName(SOURCE_SEPOLIA),
      value: SOURCE_SEPOLIA,
      icon: getChainIcon(SOURCE_SEPOLIA),
      color: "#aa00ff",
    }
  );
}

export function AppHeaderChainAndSettings({ menuToggle, openSettings, showRedirectModal }: Props) {
  const { chainId: settlementChainId, srcChainId } = useChainId();

  const { active, account } = useWallet();
  const { openConnectModal } = useConnectModal();
  const showConnectionOptions = !isHomeSite();
  const [tradePageVersion] = useTradePageVersion();
  const [redirectPopupTimestamp] = useRedirectPopupTimestamp();

  const tradeLink = tradePageVersion === 2 ? "/trade" : "/v1";

  const visualChainId = srcChainId ?? settlementChainId;

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
        {isHomeSite() ? (
          <div data-qa="trade" className="App-header-trade-link homepage-header text-body-medium">
            <HeaderLink
              className="default-btn"
              onClick={trackLaunchApp}
              to={`${tradeLink}?${userAnalytics.getSessionForwardParams()}`}
              showRedirectModal={showRedirectModal}
            >
              <Trans>Launch App</Trans>
            </HeaderLink>
          </div>
        ) : null}

        {showConnectionOptions && openConnectModal ? (
          <>
            <ConnectWalletButton
              onClick={() => {
                sendUserAnalyticsConnectWalletClickEvent("Header");
                openConnectModal();
              }}
            >
              <Trans>Connect Wallet</Trans>
            </ConnectWalletButton>
            <OneClickButton openSettings={openSettings} />
            <NetworkDropdown chainId={visualChainId} networkOptions={NETWORK_OPTIONS} openSettings={openSettings} />
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
      {isHomeSite() ? (
        <div data-qa="trade" className="App-header-trade-link text-body-medium">
          <HeaderLink
            className="default-btn"
            onClick={trackLaunchApp}
            to={`${tradeLink}?${userAnalytics.getSessionForwardParams()}`}
            showRedirectModal={showRedirectModal}
          >
            <Trans>Launch App</Trans>
          </HeaderLink>
        </div>
      ) : null}

      {showConnectionOptions ? (
        <>
          <AddressDropdown account={account} />
          <OneClickButton openSettings={openSettings} />
          <NetworkDropdown chainId={visualChainId} networkOptions={NETWORK_OPTIONS} openSettings={openSettings} />
        </>
      ) : (
        <LanguagePopupHome />
      )}
      {menuToggle}
    </div>
  );
}
