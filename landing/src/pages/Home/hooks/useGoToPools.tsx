import { getLandingReferralCode } from "landing/utils/referralCode";
import { useCallback } from "react";

import { REFERRAL_CODE_QUERY_PARAM } from "lib/legacy";
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
    redirectWithWarning(makeLink(`earn/discover`));
  }, [redirectWithWarning, pool]);
}

function makeLink(path: string) {
  const refCode = getLandingReferralCode();
  const refParam = refCode ? `&${REFERRAL_CODE_QUERY_PARAM}=${encodeURIComponent(refCode)}` : "";
  return `${import.meta.env.VITE_APP_BASE_URL}/${path}?${userAnalytics.getSessionForwardParams()}${refParam}`;
}
