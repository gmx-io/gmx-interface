import { Route, Switch } from "react-router-dom";

import Home from "pages/Home/Home";
import PageNotFound from "pages/PageNotFound/PageNotFound";
import ReferralTerms from "pages/ReferralTerms/ReferralTerms";
import TermsAndConditions from "pages/TermsAndConditions/TermsAndConditions";

export function HomeRoutes({ showRedirectModal }: { showRedirectModal: (to: string) => void }) {
  return (
    <Switch>
      <Route exact path="/">
        <Home showRedirectModal={showRedirectModal} />
      </Route>
      <Route exact path="/referral-terms">
        <ReferralTerms />
      </Route>
      <Route exact path="/terms-and-conditions">
        <TermsAndConditions />
      </Route>
      <Route path="*">
        <PageNotFound />
      </Route>
    </Switch>
  );
}
