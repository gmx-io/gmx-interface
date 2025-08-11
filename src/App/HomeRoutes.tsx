import { Route, Switch } from "react-router-dom";

import PageNotFound from "pages/PageNotFound/PageNotFound";
import ReferralTerms from "pages/ReferralTerms/ReferralTerms";
import TermsAndConditions from "pages/TermsAndConditions/TermsAndConditions";

export function HomeRoutes() {
  return (
    <Switch>
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
