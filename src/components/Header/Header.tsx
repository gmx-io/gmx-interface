import { useEffect, useState } from "react";
import asurasLogo from "./HeaderAssets/asurasLogo.png";

import "./Header.css";
import { GradientButton } from "components/LandingPageComponents/BlueButtonComponents/BlueButtonComponent";

export function Header() {

  return (
    <>
      <header className="header-wrapper">
        <div className="logo-wrapper">
          <img src={asurasLogo} className="logo" alt="Asuras Logo"/>
        </div>
        <div className="navbar-wrapper">
          <ul className="navbar-items">
            <li className="navbar-item">PRESALE</li>
            <li className="navbar-item">DASHBOARD</li>
            <li className="navbar-item">EARN</li>
            <li className="navbar-item">BUY</li>
            <li className="navbar-item">MARKET</li>
            <li className="navbar-item">MORE</li>
          </ul>
        </div>
        <div className="launch-dapp-btn">
        <GradientButton >
          LAUNCH APP
        </GradientButton>
        </div>
      </header>
    </>
  );
}
