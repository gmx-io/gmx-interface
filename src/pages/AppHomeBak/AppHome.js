import { useContext } from "react";
import Footer from "components/Footer/Footer";
import "./AppHome.css";
import { BsArrowRight } from "react-icons/bs";

import { Trans } from "@lingui/macro";
import { HeaderLink } from "components/Header/HeaderLink";
import arrow from "img/arrow-narrow-right.svg";
import mobilet3light from "img/t3-mobile-light-bg.svg";
import mobilet3dark from "img/t3-mobile-dark-bg.svg";
import { ThemeContext } from "store/theme-provider";
import AppHomeContent from "./AppHomeContent";
import AppHomeContentDesktop from "./AppHomeContentDesktop";

export default function AppHome({ showRedirectModal, redirectPopupTimestamp }) {
  const theme = useContext(ThemeContext);
  const TradeNowButton = () => {
    return (
      <HeaderLink
        className="btn text-white"
        to="/trade"
        redirectPopupTimestamp={redirectPopupTimestamp}
        showRedirectModal={showRedirectModal}
      >
        <Trans>Trade Now</Trans>
        <BsArrowRight className="arrow" style={{ marginLeft: "1rem" }} src={arrow} alt="arrow" color={"white"} />
      </HeaderLink>
    );
  };

  return (
    <div className="main">
      <div className="hero">
        <div className="hero-inner">
          <div className="hero-title">
            <Trans>Decentralized</Trans>
            <br />
            <span className="Home-title-subtext">
              <Trans>Perpetual</Trans>
            </span>
            <br />
            <Trans>Exchange</Trans>
          </div>
          <TradeNowButton />
        </div>
        <AppHomeContentDesktop />
      </div>
      <div className="mobile">
        <div className="image">
          <img src={theme.isDark ? mobilet3dark : mobilet3light} alt="" />
        </div>
        <div className="text">
          <p>
            <Trans>Decentralized </Trans>
            <br />
            <span className="subtext">
              <Trans>Perpetual</Trans>
            </span>
            <br />
            <Trans>Exchange</Trans>
          </p>
          <TradeNowButton />
        </div>
        <AppHomeContent />
      </div>
      <Footer />
    </div>
  );
}
