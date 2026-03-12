import { useCallback } from "react";

import type { LandingPageLaunchAppEvent } from "lib/userAnalytics/types";
import { userAnalytics } from "lib/userAnalytics/UserAnalytics";
import {
  ARBITRUM,
  AVALANCHE,
  BOTANIX,
  SOURCE_ETHEREUM_MAINNET,
  SOURCE_BASE_MAINNET,
  SOURCE_BSC_MAINNET,
} from "sdk/configs/chainIds";
import { getChainName } from "sdk/configs/chains";

import { useHomePageContext } from "../contexts/HomePageContext";

export enum RedirectChainIds {
  Arbitum = ARBITRUM,
  Avalanche = AVALANCHE,
  Botanix = BOTANIX,
  Base = SOURCE_BASE_MAINNET,
  Bsc = SOURCE_BSC_MAINNET,
  Ethereum = SOURCE_ETHEREUM_MAINNET,
  Solana = -1,
}

type Props = {
  chainId: RedirectChainIds;
  buttonPosition: LandingPageLaunchAppEvent["data"]["buttonPosition"];
};

const REDIRECT_MAP: Record<RedirectChainIds, string> = {
  [RedirectChainIds.Solana]: "https://gmtrade.xyz",
  [RedirectChainIds.Base]: makeLink(SOURCE_BASE_MAINNET),
  [RedirectChainIds.Arbitum]: makeLink(ARBITRUM),
  [RedirectChainIds.Avalanche]: makeLink(AVALANCHE),
  [RedirectChainIds.Botanix]: makeLink(BOTANIX),
  [RedirectChainIds.Bsc]: makeLink(SOURCE_BSC_MAINNET),
  [RedirectChainIds.Ethereum]: makeLink(SOURCE_ETHEREUM_MAINNET),
};

export function useGoToTrade({ buttonPosition, chainId }: Props) {
  const { redirectWithWarning } = useHomePageContext();
  return useCallback(() => {
    const shouldSeeConfirmationDialog = chainId === RedirectChainIds.Solana;

    userAnalytics.pushEvent<LandingPageLaunchAppEvent>(
      {
        event: "LandingPageAction",
        data:
          chainId === RedirectChainIds.Solana
            ? {
                action: "SolanaNavigation",
                buttonPosition: buttonPosition,
                shouldSeeConfirmationDialog,
              }
            : {
                action: "LaunchApp",
                buttonPosition: buttonPosition,
                shouldSeeConfirmationDialog,
                chain: getChainName(chainId),
              },
      },
      { instantSend: true }
    );

    const redirectUrl = REDIRECT_MAP[chainId];
    if (redirectUrl) {
      redirectWithWarning(redirectUrl, chainId);
    }
  }, [redirectWithWarning, buttonPosition, chainId]);
}

function makeLink(chainId: number) {
  return `${import.meta.env.VITE_APP_BASE_URL}/trade?${userAnalytics.getSessionForwardParams()}&chainId=${chainId}`;
}
