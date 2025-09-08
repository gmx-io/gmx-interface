import { useCallback } from "react";

import type { LandingPageProtocolTokenEvent } from "lib/userAnalytics/types";
import { userAnalytics } from "lib/userAnalytics/UserAnalytics";

import { useHomePageContext } from "../contexts/HomePageContext";

export function useGoToPools(pool: LandingPageProtocolTokenEvent["data"]["type"]) {
  const { redirectWithWarning } = useHomePageContext();

  return useCallback(() => {
    userAnalytics.pushEvent<LandingPageProtocolTokenEvent>(
      {
        event: "LandingPageAction",
        data: {
          action: "ProtocolTokenAction",
          type: pool,
          chain: "Arbitrum",
        },
      },
      { instantSend: true }
    );
    redirectWithWarning(makeLink(pool === "GMX" ? "stake" : "pools"));
  }, [redirectWithWarning, pool]);
}

function makeLink(path: string) {
  return `${import.meta.env.VITE_APP_BASE_URL}/${path}?${userAnalytics.getSessionForwardParams()}`;
}
