import { lazy, Suspense, useEffect } from "react";
import { Redirect, Route, RouteComponentProps, Switch, useLocation, useRouteMatch } from "react-router-dom";

import { LandingLayout } from "./components/LandingLayout/LandingLayout";
import { useConfigureLandingAnalytics } from "./hooks/useConfigureLandingAnalytics";
import Home from "./pages/Home/Home";
import Rewards from "./pages/Rewards/Rewards";
import { RewardsHeaderBadge } from "./pages/Rewards/RewardsHeaderBadge";
import { getLandingScrollContainer } from "./utils/getLandingScrollContainer";
import { scrollToLandingSection } from "./utils/scrollToLandingSection";

const Builders = lazy(() => import("./pages/Builders/Builders"));
const ReferralTerms = lazy(() => import("./pages/ReferralTerms/ReferralTerms"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions/TermsAndConditions"));
const RewardsTermsAndConditions = lazy(() => import("./pages/RewardsTermsAndConditions/RewardsTermsAndConditions"));
const TraderAffiliateProgram = lazy(() => import("./pages/TraderAffiliateProgram/TraderAffiliateProgram"));

const LANDING_PAGE_PATHS = ["/", "/rewards", "/builders", "/trader-affiliate-program"];

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-16 text-24 font-medium text-white">Loading...</div>
        <div className="h-2 w-32 rounded-full bg-slate-700">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-400"></div>
        </div>
      </div>
    </div>
  );
}

// Preserves search so /trade/?ref=<code> doesn't lose the ref on redirect.
function RedirectToHomeWithSearch({ location }: RouteComponentProps) {
  return <Redirect to={`/${location.search}`} />;
}

function ScrollOnNavigate() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash && document.getElementById(hash.slice(1))) {
      scrollToLandingSection(hash.slice(1), 24);
      return;
    }
    getLandingScrollContainer().scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

export function LandingRoutes() {
  useConfigureLandingAnalytics();
  const isRewardsPage = Boolean(useRouteMatch({ path: "/rewards", exact: true }));

  return (
    <>
      <ScrollOnNavigate />
      <Switch>
        <Route exact path="/referral-terms">
          <Suspense fallback={<PageLoader />}>
            <ReferralTerms />
          </Suspense>
        </Route>
        <Route exact path="/terms-and-conditions">
          <Suspense fallback={<PageLoader />}>
            <TermsAndConditions />
          </Suspense>
        </Route>
        <Route exact path="/rewards-terms-and-conditions">
          <Suspense fallback={<PageLoader />}>
            <RewardsTermsAndConditions />
          </Suspense>
        </Route>
        <Route exact path={LANDING_PAGE_PATHS}>
          <LandingLayout headerBadge={isRewardsPage ? <RewardsHeaderBadge /> : undefined}>
            <Suspense fallback={<PageLoader />}>
              <Switch>
                <Route exact path="/">
                  <Home />
                </Route>
                <Route exact path="/rewards">
                  <Rewards />
                </Route>
                <Route exact path="/builders">
                  <Builders />
                </Route>
                <Route exact path="/trader-affiliate-program">
                  <TraderAffiliateProgram />
                </Route>
              </Switch>
            </Suspense>
          </LandingLayout>
        </Route>
        <Route
          exact
          path="/comeback"
          render={({ location }) => (
            <Redirect to={`/rewards${location.search}${location.hash || "#rewards-address"}`} />
          )}
        />
        <Route path="*" render={RedirectToHomeWithSearch} />
      </Switch>
    </>
  );
}
