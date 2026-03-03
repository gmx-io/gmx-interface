import { Trans } from "@lingui/macro";
import { Suspense, lazy, useEffect } from "react";
import { Redirect, Route, Switch, useLocation } from "react-router-dom";
import type { Address } from "viem";

import { isDevelopment } from "config/env";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useChainId } from "lib/chains";
import { AccountDashboard } from "pages/AccountDashboard/AccountDashboard";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";
import BeginAccountTransfer from "pages/AccountTransfer/BeginAccountTransfer/BeginAccountTransfer";
import CompleteAccountTransfer from "pages/AccountTransfer/CompleteAccountTransfer/CompleteAccountTransfer";
import { AccountsRouter } from "pages/Actions/ActionsRouter";
import BuyGMX from "pages/BuyGMX/BuyGMX";
import DashboardV2 from "pages/Dashboard/DashboardV2";
import EarnAdditionalOpportunitiesPage from "pages/Earn/EarnAdditionalOpportunitiesPage";
import EarnDiscoveryPage from "pages/Earn/EarnDiscoveryPage";
import EarnDistributionsPage from "pages/Earn/EarnDistributionsPage";
import EarnPortfolioPage from "pages/Earn/EarnPortfolioPage";
import Ecosystem from "pages/Ecosystem/Ecosystem";
import Jobs from "pages/Jobs/Jobs";
import { CompetitionRedirect, LeaderboardPage } from "pages/LeaderboardPage/LeaderboardPage";
import PageNotFound from "pages/PageNotFound/PageNotFound";
import { ParseTransactionPage } from "pages/ParseTransaction/ParseTransaction";
import Pools from "pages/Pools/Pools";
import { PoolsDetails } from "pages/PoolsDetails/PoolsDetails";
import { PriceImpactRebatesStatsPage } from "pages/PriceImpactRebatesStats/PriceImpactRebatesStats";
import Referrals from "pages/Referrals/Referrals";
import ReferralsTier from "pages/ReferralsTier/ReferralsTier";
import { SyntheticsPage } from "pages/SyntheticsPage/SyntheticsPage";
import { SyntheticsStats } from "pages/SyntheticsStats/SyntheticsStats";

import { EarnRedirect } from "components/Earn/EarnRedirect";
import { RedirectWithQuery } from "components/RedirectWithQuery/RedirectWithQuery";

const LazyUiPage = lazy(() => import("pages/UiPage/UiPage"));
const UiPage = () => (
  <Suspense fallback={<Trans>Loading...</Trans>}>
    <LazyUiPage />
  </Suspense>
);

const LazyDevSmartWalletPage = lazy(() => import("pages/DevSmartWallet/DevSmartWallet"));
const DevSmartWalletPage = () => (
  <Suspense fallback={<Trans>Loading...</Trans>}>
    <LazyDevSmartWalletPage />
  </Suspense>
);

const LazyRpcDebug = lazy(() => import("pages/RpcDebug/RpcDebug"));
const RpcDebugPage = () => (
  <Suspense fallback={<Trans>Loading...</Trans>}>
    <LazyRpcDebug />
  </Suspense>
);

const LazyDebugOracleKeeper = lazy(() => import("pages/DebugOracleKeeper/DebugOracleKeeper"));
const OracleDebugPage = () => (
  <Suspense fallback={<Trans>Loading...</Trans>}>
    <LazyDebugOracleKeeper />
  </Suspense>
);

const LazyTestPermits = lazy(() =>
  import("pages/TestPermits/TestPermits").then((module) => ({ default: module.TestPermits }))
);
const TestPermitsPage = () => (
  <Suspense fallback={<Trans>Loading...</Trans>}>
    <LazyTestPermits />
  </Suspense>
);

const LazyAccountEvents = lazy(() =>
  import("pages/AccountEvents/AccountEvents").then((module) => ({ default: module.AccountEvents }))
);
const AccountEventsPage = () => (
  <Suspense fallback={<Trans>Loading...</Trans>}>
    <LazyAccountEvents />
  </Suspense>
);

const LazyDecodeError = lazy(() =>
  import("pages/DecodeError/DecodeError").then((module) => ({ default: module.DecodeError }))
);
const DecodeErrorPage = () => (
  <Suspense fallback={<Trans>Loading...</Trans>}>
    <LazyDecodeError />
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
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="referrals">
          <Referrals />
        </SyntheticsStateContextProvider>
      </Route>
      <Route exact path="/referrals/:account">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="referrals">
          <Referrals />
        </SyntheticsStateContextProvider>
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
        <Route exact path="/dev-smart-wallet" key="dev-smart-wallet">
          <DevSmartWalletPage />
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
