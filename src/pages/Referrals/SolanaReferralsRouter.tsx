import { matchPath, useLocation } from "react-router-dom";
import { isAddress } from "viem";

import { EvmNetworksOnlyNotice } from "pages/SolanaNetwork/SolanaNetwork";

import { RedirectWithQuery } from "components/RedirectWithQuery/RedirectWithQuery";
import { SolanaReferralsTab, SOLANA_REFERRALS_TABS } from "components/Referrals/Solana/solanaReferralsTypes";

import SolanaReferrals from "./SolanaReferrals";

// Solana has two tabs. EVM-only referral pages (Distributions, EVM account views) keep their URL and show the
// "EVM networks only" notice, so switching to an EVM network opens them. Other paths go to Trader benefits.
export function SolanaReferralsRouter() {
  const { pathname } = useLocation();
  const match = matchPath<{ tabName: string; address?: string }>(pathname, {
    path: "/referrals/:tabName/:address?",
    exact: true,
  });

  if (!match) {
    return <RedirectWithQuery to="/referrals/traders" />;
  }

  const { tabName, address } = match.params;
  const isEvmOnlyPage =
    tabName === "distributions" ||
    isAddress(tabName, { strict: false }) ||
    Boolean(address && isAddress(address, { strict: false }));

  if (isEvmOnlyPage) {
    return <EvmNetworksOnlyNotice />;
  }

  if (address || !SOLANA_REFERRALS_TABS.includes(tabName as SolanaReferralsTab)) {
    return <RedirectWithQuery to="/referrals/traders" />;
  }

  return <SolanaReferrals activeTab={tabName as SolanaReferralsTab} />;
}
