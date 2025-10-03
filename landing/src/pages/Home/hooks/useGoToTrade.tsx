import { useCallback } from "react";

import type { LandingPageLaunchAppEvent } from "lib/userAnalytics/types";
import { userAnalytics } from "lib/userAnalytics/UserAnalytics";
import { ARBITRUM, AVALANCHE, BOTANIX, SOURCE_BASE_MAINNET, SOURCE_BSC_MAINNET } from "sdk/configs/chainIds";
import { getChainName } from "sdk/configs/chains";

import { useHomePageContext } from "../contexts/HomePageContext";

export enum RedirectChainIds {
  Arbitum,
  Avalanche,
  Botanix,
  Solana,
  Base,
  Bsc,
}

type Props = {
  chainId: RedirectChainIds;
  buttonPosition: LandingPageLaunchAppEvent["data"]["buttonPosition"];
};

const REDIRECT_MAP = {
  [RedirectChainIds.Solana]: "https://gmxsol.io/",
  [RedirectChainIds.Base]: makeLink(SOURCE_BASE_MAINNET),
  [RedirectChainIds.Arbitum]: makeLink(ARBITRUM),
  [RedirectChainIds.Avalanche]: makeLink(AVALANCHE),
  [RedirectChainIds.Botanix]: makeLink(BOTANIX),
  [RedirectChainIds.Bsc]: makeLink(SOURCE_BSC_MAINNET),
};

export function useGoToTrade({ buttonPosition, chainId }: Props) {
  const { shouldShowRedirectModal, redirectWithWarning } = useHomePageContext();
  return useCallback(() => {
    userAnalytics.pushEvent<LandingPageLaunchAppEvent>(
      {
        event: "LandingPageAction",
        data: {
          action: chainId === RedirectChainIds.Solana ? "SolanaNavigation" : "LaunchApp",
          buttonPosition: buttonPosition,
          shouldSeeConfirmationDialog: shouldShowRedirectModal(),
          chain: getChainName(chainId),
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
