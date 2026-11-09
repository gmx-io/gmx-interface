import { matchPath, useLocation } from "react-router-dom";

import { RedirectWithQuery } from "components/RedirectWithQuery/RedirectWithQuery";
import { SolanaReferralsTab, SOLANA_REFERRALS_TABS } from "components/Referrals/Solana/solanaReferralsTypes";

import SolanaReferrals from "./SolanaReferrals";

// Solana has two tabs only. Distributions, EVM account views and unknown tabs go to Trader benefits.
export function SolanaReferralsRouter() {
  const { pathname } = useLocation();
  const match = matchPath<{ tabName: string }>(pathname, { path: "/referrals/:tabName", exact: true });
  const tabName = match?.params.tabName as SolanaReferralsTab | undefined;

  if (!tabName || !SOLANA_REFERRALS_TABS.includes(tabName)) {
    return <RedirectWithQuery to="/referrals/traders" />;
  }

  return <SolanaReferrals activeTab={tabName} />;
}
