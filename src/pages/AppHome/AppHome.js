import Footer from "components/Footer/Footer";
import "./AppHome.css";

import { Trans } from "@lingui/macro";
import { HeaderLink } from "components/Header/HeaderLink";
import arrow from "img/arrow-narrow-right.svg";
import mobilet3 from "img/mobile-t3.png";

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
        <img className="arrow" src={arrow} alt="arrow" />
      </HeaderLink>
    );
  };

  return (
    <div class="main">
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
      </div>
      <div class="mobile">
        <div class="text">
          <p>
            <Trans>User-friendly</Trans>
            <br />
            <span className="subtext">Compliant</span>
            <br />
            Digital asset exchange
          </p>
        </div>
        <TradeNowButton />
        <div class="image">
          <img src={mobilet3} alt="" />
        </div>
      </div>
      <Footer />
    </div>
  );
}
