import { Trans } from "@lingui/macro";
import cx from "classnames";
import { Suspense, lazy, useEffect } from "react";
import { Redirect, Route, Switch, useLocation } from "react-router-dom";
import type { Address } from "viem";

import { ARBITRUM } from "config/chains";
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
import { OrderExecutionStats } from "pages/OrderExecutionStats/OrderExecutionStats";
import PageNotFound from "pages/PageNotFound/PageNotFound";
import { ParseTransactionPage } from "pages/ParseTransaction/ParseTransaction";
import Pools from "pages/Pools/Pools";
import { PoolsDetails } from "pages/PoolsDetails/PoolsDetails";
import { PriceImpactRebatesStatsPage } from "pages/PriceImpactRebatesStats/PriceImpactRebatesStats";
import { ReferralsRouter } from "pages/Referrals/ReferralsRouter";
import ReferralsTier from "pages/ReferralsTier/ReferralsTier";
import { SyntheticsPage } from "pages/SyntheticsPage/SyntheticsPage";
import { SyntheticsStats } from "pages/SyntheticsStats/SyntheticsStats";
import { TradingCostsPage } from "pages/TradingCosts/TradingCosts";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { EarnRedirect } from "components/Earn/EarnRedirect";
import { RedirectWithQuery } from "components/RedirectWithQuery/RedirectWithQuery";

const LazyUiPage = lazy(() => import("pages/UiPage/UiPage"));
const UiPage = () => (
  <Suspense fallback={<Trans>Loading...</Trans>}>
    <LazyUiPage />
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

const LazyGmxExecutionCosts = isDevelopment()
  ? lazy(() =>
      import("pages/GmxExecutionCosts/GmxExecutionCosts").then((module) => ({ default: module.GmxExecutionCostsPage }))
    )
  : undefined;

const GMX_EXECUTION_COSTS_FILTER_PLACEHOLDER_CLASSES = [
  "max-w-[260px]",
  "max-w-[120px]",
  "max-w-[120px]",
  "max-w-[120px]",
  "max-w-[150px]",
];

function LoadingBlock({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-4 bg-slate-800", className)} />;
}

function GmxExecutionCostsLoadingPage() {
  return (
    <AppPageLayout title="GMX Execution Costs">
      <div className="flex flex-col gap-16" aria-busy="true">
        <div className="rounded-8 bg-slate-900 p-20">
          <div className="flex flex-wrap items-start justify-between gap-16">
            <div className="w-full max-w-[860px]">
              <h1 className="text-24 font-medium text-typography-primary">GMX Execution Costs</h1>
              <LoadingBlock className="mt-8 h-16 w-full max-w-[720px]" />
              <LoadingBlock className="mt-6 h-16 w-full max-w-[520px]" />
            </div>
            <div className="flex min-w-[220px] flex-col items-end gap-6">
              <LoadingBlock className="h-14 w-[180px]" />
              <LoadingBlock className="h-14 w-[140px]" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-12 rounded-8 bg-slate-900 p-16 md:grid-cols-[minmax(260px,1.6fr)_repeat(3,minmax(120px,1fr))_minmax(150px,0.8fr)]">
          {GMX_EXECUTION_COSTS_FILTER_PLACEHOLDER_CLASSES.map((maxWidthClass, index) => (
            <div key={`${maxWidthClass}-${index}`} className="flex min-w-0 flex-col gap-6">
              <LoadingBlock className="h-14 w-80" />
              <LoadingBlock className={cx("h-42 w-full", maxWidthClass)} />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="rounded-8 bg-slate-900 p-16">
              <LoadingBlock className="h-14 w-96" />
              <LoadingBlock className="mt-10 h-28 w-[120px]" />
              <LoadingBlock className="mt-8 h-14 w-[108px]" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-16 xl:grid-cols-2">
          {["distribution", "range", "scatter", "components"].map((key) => (
            <div key={key} className="rounded-8 bg-slate-900 p-16">
              <LoadingBlock className="h-18 w-[220px]" />
              <LoadingBlock className="mt-12 h-[280px] w-full" />
            </div>
          ))}

          <div className="rounded-8 bg-slate-900 p-16 xl:col-span-2">
            <LoadingBlock className="h-18 w-[120px]" />
            <LoadingBlock className="mt-12 h-[280px] w-full" />
          </div>

          <div className="rounded-8 bg-slate-900 p-16 xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-12">
              <LoadingBlock className="h-18 w-[180px]" />
              <LoadingBlock className="h-32 w-[260px]" />
            </div>
            <LoadingBlock className="mt-16 h-[420px] w-full" />
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}

const GmxExecutionCostsPage = () => (
  <Suspense fallback={<GmxExecutionCostsLoadingPage />}>
    {LazyGmxExecutionCosts ? <LazyGmxExecutionCosts /> : null}
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
      <Route exact path="/costs">
        <SyntheticsStateContextProvider skipLocalReferralCode pageType="tradingCosts" overrideChainId={ARBITRUM}>
          <TradingCostsPage />
        </SyntheticsStateContextProvider>
      </Route>
      <Route exact path="/order_execution_stats">
        <OrderExecutionStats />
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
      <RedirectWithQuery exact from="/referrals" to="/referrals/traders" />
      <Route path="/referrals">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="referrals">
          <ReferralsRouter />
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
        <Route exact path="/permits" key="permits">
          <TestPermitsPage />
        </Route>,
        <Route exact path="/account-events/:account?" key="account-events">
          <AccountEventsPage />
        </Route>,
        <Route exact path="/decode-error" key="decode-error">
          <DecodeErrorPage />
        </Route>,
        <Route exact path="/gmx-execution-costs" key="gmx-execution-costs">
          <GmxExecutionCostsPage />
        </Route>,
      ]}
      <Route path="*">
        <PageNotFound />
      </Route>
    </Switch>
  );
}
