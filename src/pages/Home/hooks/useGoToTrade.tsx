import { useCallback } from "react";

import { ARBITRUM, AVALANCHE, BOTANIX, UiSupportedChain } from "config/chains";
import { getAppBaseUrl, shouldShowRedirectModal } from "lib/legacy";
import { userAnalytics } from "lib/userAnalytics";
import { LandingPageLaunchAppEvent } from "lib/userAnalytics/types";

import { useHomePageContext } from "../contexts/HomePageContext";

export enum REDIRECT_CHAIN_IDS {
  Arbitum = ARBITRUM,
  Avalanche = AVALANCHE,
  Botanix = BOTANIX,
  Solana = "Solana",
  Base = "Base",
}

type Props = {
  chainId: REDIRECT_CHAIN_IDS;
  showRedirectModal: (to: string) => void;
  buttonPosition: LandingPageLaunchAppEvent["data"]["buttonPosition"];
};

export function useGoToTrade({ showRedirectModal, buttonPosition, chainId }: Props) {
  const { redirectPopupTimestamp } = useHomePageContext();
  return useCallback(() => {
    userAnalytics.pushEvent<LandingPageLaunchAppEvent>(
      {
        event: "LandingPageAction",
        data: {
          action: "LaunchApp",
          buttonPosition: buttonPosition,
          shouldSeeConfirmationDialog: shouldShowRedirectModal(redirectPopupTimestamp),
        },
      },
      { instantSend: true }
    );
    if (chainId === REDIRECT_CHAIN_IDS.Solana) {
      showRedirectModal("https://gmxsol.io/");
    } else if (chainId === REDIRECT_CHAIN_IDS.Base) {
      showRedirectModal(makeLink(REDIRECT_CHAIN_IDS.Arbitum));
    } else {
      showRedirectModal(makeLink(chainId));
    }
  }, [showRedirectModal, redirectPopupTimestamp, buttonPosition, chainId]);
}

function makeLink(chainId: UiSupportedChain) {
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}/trade?${userAnalytics.getSessionIdUrlParams()}&chainId=${chainId}`;
}
