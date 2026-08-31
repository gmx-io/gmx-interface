import { Suspense, lazy, useEffect, type ComponentType } from "react";
import { Redirect, Route, Switch, useLocation } from "react-router-dom";
import type { Address } from "viem";

import { ContractsChainId } from "config/chains";
import { isDevelopment } from "config/env";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useChainId } from "lib/chains";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";
import { NETWORK_QUERY_PARAM, NETWORK_SLUGS_ID_MAP } from "pages/AccountDashboard/constants";
import PageNotFound from "pages/PageNotFound/PageNotFound";
import { SyntheticsPage } from "pages/SyntheticsPage/SyntheticsPage";

import { EarnRedirect } from "components/Earn/EarnRedirect";
import ErrorBoundary from "components/Errors/ErrorBoundary";
import Loader from "components/Loader/Loader";
import { RedirectWithQuery } from "components/RedirectWithQuery/RedirectWithQuery";

const LEGACY_TRADER_PROFILE_PATHS = ["/accounts/:account", "/actions/:account"];

function getChainIdFromSearch(search: string, fallbackChainId: ContractsChainId) {
  const networkSlug = new URLSearchParams(search).get(NETWORK_QUERY_PARAM);

  return (NETWORK_SLUGS_ID_MAP[networkSlug ?? ""] as ContractsChainId | undefined) ?? fallbackChainId;
}

// Every page is code-split to keep the boot bundle small, except the trade page
// (the default route) and PageNotFound (must render even if chunk loading fails).
// The boundary keeps a failed chunk load from unmounting the whole app.
function lazyPage(load: () => Promise<{ default: ComponentType }>) {
  const LazyComponent = lazy(load);

  return function LazyPage() {
    return (
      <ErrorBoundary id="LazyPage" variant="page">
        <Suspense fallback={<Loader />}>
          <LazyComponent />
        </Suspense>
      </ErrorBoundary>
    );
  };
}

const AccountDashboard = lazyPage(() =>
  import("pages/AccountDashboard/AccountDashboard").then((module) => ({ default: module.AccountDashboard }))
);
const BeginAccountTransfer = lazyPage(() => import("pages/AccountTransfer/BeginAccountTransfer/BeginAccountTransfer"));
const CompleteAccountTransfer = lazyPage(
  () => import("pages/AccountTransfer/CompleteAccountTransfer/CompleteAccountTransfer")
);
const AccountsRouter = lazyPage(() =>
  import("pages/Actions/ActionsRouter").then((module) => ({ default: module.AccountsRouter }))
);
const AnnouncementsPage = lazyPage(() => import("pages/Announcements/Announcements"));
const BuyGMX = lazyPage(() => import("pages/BuyGMX/BuyGMX"));
const DashboardV2 = lazyPage(() => import("pages/Dashboard/DashboardV2"));
const EarnAdditionalOpportunitiesPage = lazyPage(() => import("pages/Earn/EarnAdditionalOpportunitiesPage"));
const EarnDiscoveryPage = lazyPage(() => import("pages/Earn/EarnDiscoveryPage"));
const EarnDistributionsPage = lazyPage(() => import("pages/Earn/EarnDistributionsPage"));
const EarnPortfolioPage = lazyPage(() => import("pages/Earn/EarnPortfolioPage"));
const Ecosystem = lazyPage(() => import("pages/Ecosystem/Ecosystem"));
const Jobs = lazyPage(() => import("pages/Jobs/Jobs"));
const LeaderboardPage = lazyPage(() =>
  import("pages/LeaderboardPage/LeaderboardPage").then((module) => ({ default: module.LeaderboardPage }))
);
const CompetitionRedirect = lazyPage(() =>
  import("pages/LeaderboardPage/LeaderboardPage").then((module) => ({ default: module.CompetitionRedirect }))
);
const ParseTransactionPage = lazyPage(() =>
  import("pages/ParseTransaction/ParseTransaction").then((module) => ({ default: module.ParseTransactionPage }))
);
const Pools = lazyPage(() => import("pages/Pools/Pools"));
const PoolsDetails = lazyPage(() =>
  import("pages/PoolsDetails/PoolsDetails").then((module) => ({ default: module.PoolsDetails }))
);
const PriceImpactRebatesStatsPage = lazyPage(() =>
  import("pages/PriceImpactRebatesStats/PriceImpactRebatesStats").then((module) => ({
    default: module.PriceImpactRebatesStatsPage,
  }))
);
const ReferralsRouter = lazyPage(() =>
  import("pages/Referrals/ReferralsRouter").then((module) => ({ default: module.ReferralsRouter }))
);
const ReferralsTier = lazyPage(() => import("pages/ReferralsTier/ReferralsTier"));
const SyntheticsStats = lazyPage(() =>
  import("pages/SyntheticsStats/SyntheticsStats").then((module) => ({ default: module.SyntheticsStats }))
);
const UiPage = lazyPage(() => import("pages/UiPage/UiPage"));
const RpcDebugPage = lazyPage(() => import("pages/RpcDebug/RpcDebug"));
const OracleDebugPage = lazyPage(() => import("pages/DebugOracleKeeper/DebugOracleKeeper"));
const TestPermitsPage = lazyPage(() =>
  import("pages/TestPermits/TestPermits").then((module) => ({ default: module.TestPermits }))
);
const AccountEventsPage = lazyPage(() =>
  import("pages/AccountEvents/AccountEvents").then((module) => ({ default: module.AccountEvents }))
);
const DecodeErrorPage = lazyPage(() =>
  import("pages/DecodeError/DecodeError").then((module) => ({ default: module.DecodeError }))
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
      {/* redirect from previous dashboard url */}
      <RedirectWithQuery exact from="/dashboard" to="/stats" />
      <RedirectWithQuery exact from="/monitor/v2" to="/monitor" />
      {/* redirect from previous stake(earn) url */}
      <RedirectWithQuery exact from="/stake" to="/earn" />
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
      <Route exact path="/monitor">
        <SyntheticsStats />
      </Route>
      <Route exact path="/earn/discover">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="earn">
          <EarnDiscoveryPage />
        </SyntheticsStateContextProvider>
      </Route>
      <Route exact path="/earn/portfolio">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="earn">
          <EarnPortfolioPage />
        </SyntheticsStateContextProvider>
      </Route>
      <Route exact path="/earn/additional_opportunities/:filter?">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="earn">
          <EarnAdditionalOpportunitiesPage />
        </SyntheticsStateContextProvider>
      </Route>
      <Route exact path="/earn/distributions">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="earn">
          <EarnDistributionsPage />
        </SyntheticsStateContextProvider>
      </Route>
      <Route path="/earn">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="earn">
          <EarnRedirect />
        </SyntheticsStateContextProvider>
      </Route>
      <Route exact path="/pools">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="pools">
          <Pools />
        </SyntheticsStateContextProvider>
      </Route>
      <Route exact path="/pools/details">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="pools">
          <PoolsDetails />
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
      <Route exact path="/announcements">
        <AnnouncementsPage />
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
      <RedirectWithQuery exact from="/referrals" to="/referrals/traders" />
      <Route path="/referrals">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="referrals">
          <ReferralsRouter />
        </SyntheticsStateContextProvider>
      </Route>
      <Route exact path="/traders">
        <AccountsRouter />
      </Route>
      <Route exact path="/traders/:account">
        <AccountDashboard />
      </Route>
      <RedirectWithQuery exact from="/accounts" to="/traders" />
      <RedirectWithQuery exact from="/actions" to="/traders" />
      <RedirectWithQuery exact from="/actions/v2" to="/traders" />
      <Route exact path="/actions/:v/:account">
        {({ match, location }) => (
          <Redirect
            to={buildAccountDashboardUrl(
              match?.params.account as Address,
              getChainIdFromSearch(location.search, chainId),
              match?.params.v === "v1" ? 1 : 2
            )}
          />
        )}
      </Route>
      <Route exact path={LEGACY_TRADER_PROFILE_PATHS}>
        {({ match }) => <RedirectWithQuery to={`/traders/${match?.params.account}`} />}
      </Route>
      <Route exact path="/referrals-tier">
        <ReferralsTier />
      </Route>
      <Route path="/parsetx/:network/:tx">
        <ParseTransactionPage />
      </Route>
      <Route exact path="/begin_account_transfer">
        <BeginAccountTransfer />
      </Route>
      <Route exact path="/complete_account_transfer/:sender/:receiver">
        <CompleteAccountTransfer />
      </Route>
      <Route exact path="/rpc-debug" key="rpc-debug">
        <SyntheticsStateContextProvider skipLocalReferralCode pageType="rpcDebug">
          <RpcDebugPage />
        </SyntheticsStateContextProvider>
      </Route>
      <Route exact path="/oracle-keeper-debug" key="oracle-keeper-debug">
        <OracleDebugPage />
      </Route>
      {isDevelopment() && [
        <Route exact path="/ui" key="ui">
          <UiPage />
        </Route>,
        <Route exact path="/permits" key="permits">
          <TestPermitsPage />
        </Route>,
        <Route exact path="/account-events/:account?" key="account-events">
          <AccountEventsPage />
        </Route>,
        <Route exact path="/decode-error" key="decode-error">
          <DecodeErrorPage />
        </Route>,
      ]}
      <Route path="*">
        <PageNotFound />
      </Route>
    </Switch>
  );
}
