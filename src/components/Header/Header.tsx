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
            <li className="navbar-item">MARKETS</li>
            <li className="navbar-item">GOVERNANCE</li>
            <li className="navbar-item">VOTING</li>
            <li className="navbar-item">PRESALE</li>
            <li className="navbar-item">MORE</li>
          </ul>
        </div>
        <GradientButton >
          LAUNCH APP
        </GradientButton>
      </header>
    </>
  );
}
