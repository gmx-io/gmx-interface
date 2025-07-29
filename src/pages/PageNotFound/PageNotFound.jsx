import { Trans, t } from "@lingui/macro";

import { getPageTitle } from "lib/legacy";
import { getHomeUrl, getTradePageUrl } from "lib/legacy";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import SEO from "components/Common/SEO";

import "./PageNotFound.css";

function PageNotFound() {
  const homeUrl = getHomeUrl();
  const tradePageUrl = getTradePageUrl();

  return (
    <AppPageLayout>
      <SEO title={getPageTitle(t`Page not found`)}>
        <div className="page-layout">
          <div className="page-not-found-container">
            <div className="page-not-found">
              <h2>
                <Trans>Page not found</Trans>
              </h2>
              <p className="go-back">
                <Trans>
                  <span>Return to </span>
                  <a href={homeUrl}>Homepage</a> <span>or </span> <a href={tradePageUrl}>Trade</a>
                </Trans>
              </p>
            </div>
          </div>
        </div>
      </SEO>
    </AppPageLayout>
  );
}

export default PageNotFound;
