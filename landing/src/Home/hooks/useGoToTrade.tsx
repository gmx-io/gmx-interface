import { useCallback } from "react";

import type { LandingPageLaunchAppEvent } from "lib/userAnalytics/types";
import { userAnalytics } from "lib/userAnalytics/UserAnalytics";
import { ARBITRUM, AVALANCHE, BOTANIX } from "sdk/configs/chainIds";

import { useHomePageContext } from "../contexts/HomePageContext";

export enum REDIRECT_CHAIN_IDS {
  Arbitum,
  Avalanche,
  Botanix,
  Solana,
  Base,
}

type Props = {
  chainId: REDIRECT_CHAIN_IDS;
  buttonPosition: LandingPageLaunchAppEvent["data"]["buttonPosition"];
};

const REDIRECT_MAP = {
  [REDIRECT_CHAIN_IDS.Solana]: "https://gmxsol.io/",
  [REDIRECT_CHAIN_IDS.Base]: makeLink(ARBITRUM),
  [REDIRECT_CHAIN_IDS.Arbitum]: makeLink(ARBITRUM),
  [REDIRECT_CHAIN_IDS.Avalanche]: makeLink(AVALANCHE),
  [REDIRECT_CHAIN_IDS.Botanix]: makeLink(BOTANIX),
};

export function useGoToTrade({ buttonPosition, chainId }: Props) {
  const { shouldShowRedirectModal, redirectWithWarning } = useHomePageContext();
  return useCallback(() => {
    userAnalytics.pushEvent<LandingPageLaunchAppEvent>(
      {
        event: "LandingPageAction",
        data: {
          action: chainId === REDIRECT_CHAIN_IDS.Solana ? "SolanaNavigation" : "LaunchApp",
          buttonPosition: buttonPosition,
          shouldSeeConfirmationDialog: shouldShowRedirectModal(),
        },
      },
      { instantSend: true }
    );

    const redirectUrl = REDIRECT_MAP[chainId];
    if (redirectUrl) {
      redirectWithWarning(redirectUrl, chainId);
    }
  }, [redirectWithWarning, shouldShowRedirectModal, buttonPosition, chainId]);
}

function makeLink(chainId: number) {
  return `${import.meta.env.VITE_APP_BASE_URL}/trade?${userAnalytics.getSessionForwardParams()}&chainId=${chainId}`;
}
