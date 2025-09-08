import { lazy, Suspense } from "react";
import { Redirect, Route, Switch } from "react-router-dom";

import Home from "./Home/Home";

// Lazy load Terms pages to reduce main bundle size
const ReferralTerms = lazy(() => import("./ReferralTerms/ReferralTerms"));
const TermsAndConditions = lazy(() => import("./TermsAndConditions/TermsAndConditions"));

// Loading fallback component
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
      <Route path="*">
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}
