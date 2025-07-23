import { useCallback } from "react";

import type { UiSupportedChain } from "config/chains";
import type { LandingPageLaunchAppEvent } from "lib/userAnalytics/types";
import { userAnalytics } from "lib/userAnalytics/UserAnalytics";
import { ARBITRUM, AVALANCHE, BOTANIX } from "sdk/configs/chainIds";

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
  buttonPosition: LandingPageLaunchAppEvent["data"]["buttonPosition"];
};

export function useGoToTrade({ buttonPosition, chainId }: Props) {
  const { shouldShowRedirectModal, redirectWithWarning } = useHomePageContext();
  return useCallback(() => {
    userAnalytics.pushEvent<LandingPageLaunchAppEvent>(
      {
        event: "LandingPageAction",
        data: {
          action: "LaunchApp",
          buttonPosition: buttonPosition,
          shouldSeeConfirmationDialog: shouldShowRedirectModal(),
        },
      },
      { instantSend: true }
    );
    if (chainId === REDIRECT_CHAIN_IDS.Solana) {
      redirectWithWarning("https://gmxsol.io/");
    } else if (chainId === REDIRECT_CHAIN_IDS.Base) {
      redirectWithWarning(makeLink(REDIRECT_CHAIN_IDS.Arbitum));
    } else {
      redirectWithWarning(makeLink(chainId));
    }
  }, [redirectWithWarning, shouldShowRedirectModal, buttonPosition, chainId]);
}

function makeLink(chainId: UiSupportedChain) {
  return `${import.meta.env.VITE_APP_BASE_URL}/trade?${userAnalytics.getSessionIdUrlParams()}&chainId=${chainId}`;
}
