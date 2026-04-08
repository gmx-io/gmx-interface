import { matchPath, useLocation } from "react-router-dom";
import { getAddress, isAddress } from "viem";
import { useAccount } from "wagmi";

import { RedirectWithQuery } from "components/RedirectWithQuery/RedirectWithQuery";

import Referrals, { ReferralsTab, TAB_OPTIONS } from "./Referrals";

/**
 * Handles all referral routing: redirects, backward compatibility, and renders Referrals.
 * Route parsing happens here once, and parsed params are passed to Referrals as props.
 */
export function ReferralsRouter() {
  const { pathname } = useLocation();
  const { address: walletAddress } = useAccount();
  const match = matchPath<{ tabName: string; address?: string }>(pathname, {
    path: "/referrals/:tabName/:address?",
    exact: true,
  });

  if (!match) {
    return <RedirectWithQuery to="/referrals/traders" />;
  }

  const tabName = match.params.tabName;
  const address = match.params.address;

  // /referrals/0x123 (legacy) -> /referrals/traders/0x123
  if (isAddress(tabName, { strict: false })) {
    return <RedirectWithQuery to={`/referrals/traders/${getAddress(tabName)}`} />;
  }

  // /referrals/invalid-tab -> /referrals/traders
  if (!TAB_OPTIONS.includes(tabName as ReferralsTab)) {
    return <RedirectWithQuery to="/referrals/traders" />;
  }

  const hasAddressInUrl = Boolean(address && isAddress(address, { strict: false }));
  const account = hasAddressInUrl ? getAddress(address!) : walletAddress;

  return <Referrals account={account} activeTab={tabName as ReferralsTab} hasAddressInUrl={hasAddressInUrl} />;
}
