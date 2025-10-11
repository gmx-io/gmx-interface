import { Trans } from "@lingui/macro";
import { Suspense, lazy, useEffect } from "react";
import { Redirect, Route, Switch, useLocation } from "react-router-dom";
import type { Address } from "viem";

import { isDevelopment } from "config/env";
import { PoolsDetailsContextProvider } from "context/PoolsDetailsContext/PoolsDetailsContext";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useChainId } from "lib/chains";
import { AccountDashboard } from "pages/AccountDashboard/AccountDashboard";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";
import { AccountsRouter } from "pages/Actions/ActionsRouter";
import Buy from "pages/Buy/Buy";
import BuyGMX from "pages/BuyGMX/BuyGMX";
import ClaimEsGmx from "pages/ClaimEsGmx/ClaimEsGmx";
import DashboardV2 from "pages/Dashboard/DashboardV2";
import EarnAdditionalOpportunitiesPage from "pages/Earn/EarnAdditionalOpportunitiesPage";
import EarnDiscoveryPage from "pages/Earn/EarnDiscoveryPage";
import EarnDistributionsPage from "pages/Earn/EarnDistributionsPage";
import EarnPortfolioPage from "pages/Earn/EarnPortfolioPage";
import Ecosystem from "pages/Ecosystem/Ecosystem";
import Jobs from "pages/Jobs/Jobs";
import { CompetitionRedirect, LeaderboardPage } from "pages/LeaderboardPage/LeaderboardPage";
import NftWallet from "pages/NftWallet/NftWallet";
import PageNotFound from "pages/PageNotFound/PageNotFound";
import { ParseTransactionPage } from "pages/ParseTransaction/ParseTransaction";
import Pools from "pages/Pools/Pools";
import { PoolsDetails } from "pages/PoolsDetails/PoolsDetails";
import { PriceImpactRebatesStatsPage } from "pages/PriceImpactRebatesStats/PriceImpactRebatesStats";
import Referrals from "pages/Referrals/Referrals";
import ReferralsTier from "pages/ReferralsTier/ReferralsTier";
import Stats from "pages/Stats/Stats";
import { SyntheticsPage } from "pages/SyntheticsPage/SyntheticsPage";
import { SyntheticsStats } from "pages/SyntheticsStats/SyntheticsStats";
import { TestPermits } from "pages/TestPermits/TestPermits";

import { EarnRedirect } from "components/Earn/EarnRedirect";
import { RedirectWithQuery } from "components/RedirectWithQuery/RedirectWithQuery";

const LazyUiPage = lazy(() => import("pages/UiPage/UiPage"));
export const UiPage = () => (
  <Suspense fallback={<Trans>Loading...</Trans>}>
    <LazyUiPage />
  </Suspense>
);

export function MainRoutes({ openSettings }: { openSettings: () => void }) {
  const { chainId } = useChainId();

  const { pathname } = useLocation();

  // new page should be scrolled to top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <Switch>
      <Redirect exact from="/actions/v2" to="/accounts" />
      <Redirect exact from="/actions" to="/accounts" />
      <Redirect exact from="/actions/:account" to="/accounts/:account" />
      {/* redirect from previous dashboard url */}
      <RedirectWithQuery exact from="/dashboard" to="/stats" />
      <RedirectWithQuery exact from="/monitor/v2" to="/monitor" />
      <RedirectWithQuery from="/v2" to="/trade" />

      <Route exact path="/">
        <RedirectWithQuery to="/trade" />
      </Route>
      <Route exact path="/v1">
        <RedirectWithQuery to="/trade" />
      </Route>
      <Route exact path="/price_impact_rebates_stats">
        <PriceImpactRebatesStatsPage />
      </Route>
      <Route exact path="/stats">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="stats">
          <DashboardV2 />
        </SyntheticsStateContextProvider>
      </Route>

      <Route exact path="/monitor/v1">
        <Stats />
      </Route>

      <Route exact path="/monitor">
        <SyntheticsStats />
      </Route>

      <Route exact path="/earn">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="earn">
          <EarnRedirect />
        </SyntheticsStateContextProvider>
      </Route>
      <Route exact path="/earn/discovery">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="earn">
          <EarnDiscoveryPage />
        </SyntheticsStateContextProvider>
      </Route>
      <Route exact path="/earn/portfolio">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="earn">
          <EarnPortfolioPage />
        </SyntheticsStateContextProvider>
      </Route>
      <Route exact path="/earn/additional-opportunities/:filter?">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="earn">
          <EarnAdditionalOpportunitiesPage />
        </SyntheticsStateContextProvider>
      </Route>
      <Route exact path="/earn/distributions">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="earn">
          <EarnDistributionsPage />
        </SyntheticsStateContextProvider>
      </Route>

      <Route exact path="/buy">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="buy">
          <Buy />
        </SyntheticsStateContextProvider>
      </Route>

      <Route exact path="/pools">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="pools">
          <Pools />
        </SyntheticsStateContextProvider>
      </Route>

      <Route exact path="/pools/details">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="pools">
          <PoolsDetailsContextProvider>
            <PoolsDetails />
          </PoolsDetailsContextProvider>
        </SyntheticsStateContextProvider>
      </Route>

      <Route exact path="/trade/:tradeType?">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="trade">
          <SyntheticsPage openSettings={openSettings} />
        </SyntheticsStateContextProvider>
      </Route>

      <Route exact path="/jobs">
        <Jobs />
      </Route>
      <Route exact path="/buy_gmx">
        <BuyGMX />
      </Route>
      <Route exact path="/ecosystem">
        <Ecosystem />
      </Route>

      <Route path="/leaderboard/">
        <SyntheticsStateContextProvider skipLocalReferralCode pageType="leaderboard">
          <LeaderboardPage />
        </SyntheticsStateContextProvider>
      </Route>

      <Route exact path="/competitions/">
        <SyntheticsStateContextProvider skipLocalReferralCode pageType="competitions">
          <CompetitionRedirect />
        </SyntheticsStateContextProvider>
      </Route>

      <Route path="/competitions/:leaderboardPageKey">
        <SyntheticsStateContextProvider skipLocalReferralCode pageType="competitions">
          <LeaderboardPage />
        </SyntheticsStateContextProvider>
      </Route>

      <Route exact path="/referrals">
        <Referrals />
      </Route>

      <Route exact path="/referrals/:account">
        <Referrals />
      </Route>

      <Route exact path="/nft_wallet">
        <NftWallet />
      </Route>

      <Route exact path="/claim_es_gmx">
        <ClaimEsGmx />
      </Route>

      <Route exact path="/actions/:v/:account">
        {({ match }) => (
          <Redirect
            to={buildAccountDashboardUrl(match?.params.account as Address, chainId, match?.params.v === "v1" ? 1 : 2)}
          />
        )}
      </Route>

      <Route exact path="/accounts">
        <AccountsRouter />
      </Route>

      <Route exact path="/accounts/:account">
        <AccountDashboard />
      </Route>

      <Route exact path="/referrals-tier">
        <ReferralsTier />
      </Route>

      <Route exact path="/monitor">
        <Stats />
      </Route>

      <Route path="/parsetx/:network/:tx">
        <ParseTransactionPage />
      </Route>

      {isDevelopment() && (
        <>
          <Route exact path="/ui">
            <UiPage />
          </Route>
          <Route exact path="/permits">
            <TestPermits />
          </Route>
        </>
      )}

      <Route path="*">
        <PageNotFound />
      </Route>
    </Switch>
  );
}
