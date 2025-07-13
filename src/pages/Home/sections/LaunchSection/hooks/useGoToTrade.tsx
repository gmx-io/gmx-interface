import { useCallback } from "react";

import { shouldShowRedirectModal } from "lib/legacy";
import { userAnalytics } from "lib/userAnalytics";
import { LandingPageLaunchAppEvent } from "lib/userAnalytics/types";
import { useRedirectPopupTimestamp } from "lib/useRedirectPopupTimestamp";

type Props = {
  chain: "arb" | "base" | "solana" | "avax" | "botanix";
  showRedirectModal: (to: string) => void;
  buttonPosition: LandingPageLaunchAppEvent["data"]["buttonPosition"];
};

export function useGoToTrade({ showRedirectModal, buttonPosition, chain }: Props) {
  const [redirectPopupTimestamp] = useRedirectPopupTimestamp();
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
    if (chain === "solana") {
      showRedirectModal("https://gmxsol.io/");
    } else {
      showRedirectModal(`/trade?${userAnalytics.getSessionIdUrlParams()}&chain=${chain}`);
    }
  }, [showRedirectModal, redirectPopupTimestamp, buttonPosition, chain]);
}
