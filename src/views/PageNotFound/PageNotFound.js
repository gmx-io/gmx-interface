import SEO from "../../components/Common/SEO";
import Footer from "../../Footer";
import { getPageTitle } from "../../Helpers";
import "./PageNotFound.css";

import { getHomeUrl, getTradePageUrl } from "../../Helpers";

function PageNotFound() {
  const homeUrl = getHomeUrl();
  const tradePageUrl = getTradePageUrl();

  return (
    <SEO title={getPageTitle("Page not found")}>
      <div className="page-layout">
        <div className="page-not-found-container">
          <div className="page-not-found">
            <h2>Page not found</h2>
            <p className="go-back">
              <span>Return to </span>
              <a href={homeUrl}>Homepage</a> <span>or </span> <a href={tradePageUrl}>Trade</a>
            </p>
          </div>
        </div>
        <Footer />
      </div>
    </SEO>
  );
}

export default PageNotFound;
