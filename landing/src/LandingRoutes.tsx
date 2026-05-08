import { lazy, Suspense } from "react";
import { Redirect, Route, RouteComponentProps, Switch } from "react-router-dom";

import Home from "./pages/Home/Home";

const ReferralTerms = lazy(() => import("./pages/ReferralTerms/ReferralTerms"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions/TermsAndConditions"));

function TermsPageLoader() {
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

// Preserves search so /#/trade/?ref=<code> doesn't lose the ref on redirect.
function RedirectToHomeWithSearch({ location }: RouteComponentProps) {
  return <Redirect to={`/${location.search}`} />;
}

export function LandingRoutes() {
  return (
    <Switch>
      <Route exact path="/">
        <Home />
      </Route>
      <Route exact path="/referral-terms">
        <Suspense fallback={<TermsPageLoader />}>
          <ReferralTerms />
        </Suspense>
      </Route>
      <Route exact path="/terms-and-conditions">
        <Suspense fallback={<TermsPageLoader />}>
          <TermsAndConditions />
        </Suspense>
      </Route>
      <Route path="*" render={RedirectToHomeWithSearch} />
    </Switch>
  );
}
