import React from "react";
import "./AppHome.css";
import Footer from "components/Footer/Footer";

import { Trans } from "@lingui/macro";
import { HeaderLink } from "components/Header/HeaderLink";

export default function Home({ showRedirectModal, redirectPopupTimestamp }) {
  const LaunchExchangeButton = () => {
    return (
      <HeaderLink
        className="default-btn"
        to="/trade"
        redirectPopupTimestamp={redirectPopupTimestamp}
        showRedirectModal={showRedirectModal}
      >
        <Trans>Trade now</Trans>
      </HeaderLink>
    );
  };

  return (
    <div>
      <div className="Home">
        <div className="Home-top">
          <div className="Home-title-section-container default-container">
            <div className="Home-title-section">
              <div className="Home-title">
                <Trans>
                  User-driven
                  <br />
                  <span className="Home-title-subtext">WEB 3.0</span>
                  <br />
                  Digital asset exchange
                </Trans>
                <br />
                <LaunchExchangeButton />
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
