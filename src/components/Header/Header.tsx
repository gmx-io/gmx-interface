import { useEffect, useState } from "react";
import asurasLogo from "./HeaderAssets/asurasLogo.png";

import "./Header.css";
import { GradientButton } from "components/LandingPageComponents/BlueButtonComponents/BlueButtonComponent";
import { Link, NavLink } from "react-router-dom";
import { HeaderLink } from "./HeaderLink";
import { Trans } from "@lingui/react";
import { getAppBaseUrl, getDashboardPageUrl, getHomeUrl, getTradePageUrl } from "lib/legacy";

export function Header({redirectPopupTimestamp,showRedirectModal, isHome}) {
  console.log('isHome',isHome)
  const LaunchExchangeButton = () => {
    return (
      <HeaderLink
        className="header-btn"
        to="/trade"
        redirectPopupTimestamp={redirectPopupTimestamp}
        showRedirectModal={showRedirectModal}
      >
        <p>LAUNCH APP</p>
      </HeaderLink>
    );
  };


  return (
    <>
      <header className="header-wrapper">
        <div className="logo-wrapper">
          <img src={asurasLogo} className="logo" alt="Asuras Logo"/>
        </div>
        <div className="navbar-wrapper">
          <ul className="navbar-items">
            <a onClick={() => alert('Page not ready')} className="navbar-item">PRESALE</a>
            <a href={getDashboardPageUrl()} className="navbar-item">DASHBOARD</a>
            <a onClick={() => alert('Page not ready')} className="navbar-item">EARN</a>
            <a onClick={() => alert('Page not ready')} className="navbar-item">BUY</a>
            <a href={getTradePageUrl()} className="navbar-item">MARKET</a>
            <a href={getAppBaseUrl()} className="navbar-item">MORE</a>
          </ul>
        </div>   
        {isHome && (
          <LaunchExchangeButton />
        )}     
      </header>
    </>
  );
}
