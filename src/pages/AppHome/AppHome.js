import Footer from "components/Footer/Footer";
import "./AppHome.css";

import { Trans } from "@lingui/macro";
import { HeaderLink } from "components/Header/HeaderLink";
import arrow from "img/arrow-narrow-right.svg";

export default function AppHome({ showRedirectModal, redirectPopupTimestamp }) {
  const TradeNowButton = () => {
    return (
      <HeaderLink
        className="btn"
        to="/trade"
        redirectPopupTimestamp={redirectPopupTimestamp}
        showRedirectModal={showRedirectModal}
      >
        <Trans>Trade Now</Trans>
        <img className="logo" src={arrow} alt="arrow" />
      </HeaderLink>
    );
  };

  return (
    <div className="hero-outer">
      <div className="hero">
        <div className="hero-inner">
          <div className="hero-title">
            <Trans>User-friendly</Trans>
            <br />
            <span className="Home-title-subtext">Compliant</span>
            <br />
            Digital asset exchange
          </div>
          <TradeNowButton />
        </div>
        <Footer showRedirectModal={showRedirectModal} redirectPopupTimestamp={redirectPopupTimestamp} />
      </div>
    </div>
  );
}
