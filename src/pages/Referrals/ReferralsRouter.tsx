import { matchPath, useLocation } from "react-router-dom";
import { getAddress, isAddress } from "viem";

import { RedirectWithQuery } from "components/RedirectWithQuery/RedirectWithQuery";

import Referrals, { TAB_OPTIONS } from "./Referrals";

/**
 * Handles all referral routing: redirects, backward compatibility, and renders Referrals.
 * Consolidates referral route logic to keep MainRoutes clean.
 */
export function ReferralsRouter() {
  const { pathname } = useLocation();
  const match = matchPath<{ tabName: string; address?: string }>(pathname, {
    path: "/referrals/:tabName/:address?",
    exact: true,
  });

  const tabName = match?.params?.tabName;

  // /referrals/0x123 (legacy) -> /referrals/traders/0x123
  if (tabName && isAddress(tabName, { strict: false })) {
    return <RedirectWithQuery to={`/referrals/traders/${getAddress(tabName)}`} />;
  }

  // /referrals/invalid-tab -> /referrals/traders
  if (tabName && !TAB_OPTIONS.includes(tabName as (typeof TAB_OPTIONS)[number])) {
    return <RedirectWithQuery to="/referrals/traders" />;
  }

  return <Referrals />;
}
