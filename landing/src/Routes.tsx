import { Redirect, Route, Switch } from "react-router-dom";

import Home from "./Home/Home";
import ReferralTerms from "./ReferralTerms/ReferralTerms";
import TermsAndConditions from "./TermsAndConditions/TermsAndConditions";

export function HomeRoutes() {
  return (
    <Switch>
      <Route exact path="/">
        <Home />
      </Route>
      <Route exact path="/referral-terms">
        <ReferralTerms />
      </Route>
      <Route exact path="/terms-and-conditions">
        <TermsAndConditions />
      </Route>
      <Route path="*">
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}
