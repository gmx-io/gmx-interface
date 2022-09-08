
import { FiX } from "react-icons/fi";
import { HeaderLink } from "./HeaderLink";
import logoImg from "../../img/logo_GMX.svg";

import "./Header.css";
import { isHomeSite } from "../../lib/legacy";
import {Trans} from "@lingui/macro";
import React from "react";

type Props = {
  small?: boolean;
  clickCloseIcon?: () => void;
  openSettings?: () => void;
  redirectPopupTimestamp: number;
  showRedirectModal: (to: string) => void;
};

export function AppHeaderLinks({
   small,
   openSettings,
   clickCloseIcon,
   redirectPopupTimestamp,
   showRedirectModal
}: Props) {
  return (
    <div className="App-header-links">
      {small && (
        <div className="App-header-links-header">
          <HeaderLink
            isHomeLink={true}
            className="App-header-link-main"
            to="/"
            redirectPopupTimestamp={redirectPopupTimestamp}
            showRedirectModal={showRedirectModal}
          >
            <img src={logoImg} alt="GMX Logo" />
          </HeaderLink>
          <div className="App-header-menu-icon-block mobile-cross-menu" onClick={() => clickCloseIcon && clickCloseIcon()}>
            <FiX className="App-header-menu-icon" />
          </div>
        </div>
      )}
      <div className="App-header-link-container App-header-link-home">
        <HeaderLink
          to="/"
          exact={true}
          isHomeLink={true}
          redirectPopupTimestamp={redirectPopupTimestamp}
          showRedirectModal={showRedirectModal}
        >
          <Trans>Home</Trans>
        </HeaderLink>
      </div>
      <div className="App-header-link-container">
        <HeaderLink
          to="/dashboard"
          redirectPopupTimestamp={redirectPopupTimestamp}
          showRedirectModal={showRedirectModal}
        >
          <Trans>Dashboard</Trans>
        </HeaderLink>
      </div>
      <div className="App-header-link-container">
        <HeaderLink
          to="/earn"
          redirectPopupTimestamp={redirectPopupTimestamp}
          showRedirectModal={showRedirectModal}
        >
          <Trans>Earn</Trans>
        </HeaderLink>
      </div>
      <div className="App-header-link-container">
        <HeaderLink
          to="/buy"
          redirectPopupTimestamp={redirectPopupTimestamp}
          showRedirectModal={showRedirectModal}
        >
          <Trans>Buy</Trans>
        </HeaderLink>
      </div>
      <div className="App-header-link-container">
        <HeaderLink
          to="/referrals"
          redirectPopupTimestamp={redirectPopupTimestamp}
          showRedirectModal={showRedirectModal}
        >
          <Trans>Referrals</Trans>
        </HeaderLink>
      </div>
      <div className="App-header-link-container">
        <HeaderLink
          to="/ecosystem"
          redirectPopupTimestamp={redirectPopupTimestamp}
          showRedirectModal={showRedirectModal}
        >
          <Trans>Ecosystem</Trans>
        </HeaderLink>
      </div>
      <div className="App-header-link-container">
        <a href="src/App/App" target="_blank" rel="noopener noreferrer">
          <Trans>About</Trans>
        </a>
      </div>
      {small && !isHomeSite() && (
        <div className="App-header-link-container">
          {/* eslint-disable-next-line */}
          <a href="src/App/App#" onClick={openSettings}>
            <Trans>Settings</Trans>
          </a>
        </div>
      )}
    </div>
  );
}
