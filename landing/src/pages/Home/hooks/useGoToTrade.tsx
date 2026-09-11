import { getLandingReferralCode } from "landing/utils/referralCode";
import { useCallback } from "react";

import { REFERRAL_CODE_QUERY_PARAM } from "lib/legacy";
import type { LandingPageLaunchAppEvent } from "lib/userAnalytics/types";
import { userAnalytics } from "lib/userAnalytics/UserAnalytics";
import {
  ARBITRUM,
  AVALANCHE,
  MEGAETH,
  SOURCE_ETHEREUM_MAINNET,
  SOURCE_BASE_MAINNET,
  SOURCE_BSC_MAINNET,
} from "sdk/configs/chainIds";
import { getChainName } from "sdk/configs/chains";

import { useHomePageContext } from "../contexts/HomePageContext";

export enum RedirectChainIds {
  Arbitum = ARBITRUM,
  Avalanche = AVALANCHE,
  MegaETH = MEGAETH,
  Base = SOURCE_BASE_MAINNET,
  Bsc = SOURCE_BSC_MAINNET,
  Ethereum = SOURCE_ETHEREUM_MAINNET,
  Solana = -1,
}

type Props = {
  chainId: RedirectChainIds;
  buttonPosition: LandingPageLaunchAppEvent["data"]["buttonPosition"];
};

const TRADE_CHAIN_IDS: Record<Exclude<RedirectChainIds, RedirectChainIds.Solana>, number> = {
  [RedirectChainIds.Base]: SOURCE_BASE_MAINNET,
  [RedirectChainIds.Arbitum]: ARBITRUM,
  [RedirectChainIds.Avalanche]: AVALANCHE,
  [RedirectChainIds.MegaETH]: MEGAETH,
  [RedirectChainIds.Bsc]: SOURCE_BSC_MAINNET,
  [RedirectChainIds.Ethereum]: SOURCE_ETHEREUM_MAINNET,
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

    const redirectUrl =
      chainId === RedirectChainIds.Solana ? "https://gmtrade.xyz" : makeLink(TRADE_CHAIN_IDS[chainId]);

    if (redirectUrl) {
      redirectWithWarning(redirectUrl, chainId);
    }
  }, [redirectWithWarning, buttonPosition, chainId]);
}

function makeLink(chainId: number) {
  const refCode = getLandingReferralCode();
  const refParam = refCode ? `&${REFERRAL_CODE_QUERY_PARAM}=${encodeURIComponent(refCode)}` : "";
  return `${import.meta.env.VITE_APP_BASE_URL}/trade?${userAnalytics.getSessionForwardParams()}&chainId=${chainId}${refParam}`;
}
