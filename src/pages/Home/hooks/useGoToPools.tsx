import { useCallback } from "react";

import { getAppBaseUrl } from "lib/legacy";
import { userAnalytics } from "lib/userAnalytics";
import { LandingPageProtocolTokenEvent } from "lib/userAnalytics/types";

import { useHomePageContext } from "../contexts/HomePageContext";

export function useGoToPools(pool: LandingPageProtocolTokenEvent["data"]["type"]) {
  const { showRedirectModal } = useHomePageContext();

  return useCallback(() => {
    userAnalytics.pushEvent<LandingPageProtocolTokenEvent>(
      {
        event: "LandingPageAction",
        data: {
          action: "ProtocolTokenAction",
          type: pool,
        },
      },
      { instantSend: true }
    );
    showRedirectModal(makeLink(pool === "GMX" ? "/stake" : "/pools"));
  }, [showRedirectModal, pool]);
}

function makeLink(path: string) {
  return `${getAppBaseUrl()}/${path}?${userAnalytics.getSessionIdUrlParams()}`;
}
