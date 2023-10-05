import React from "react";
import { FiX } from "react-icons/fi";
import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";

import "./Header.css";
import ExternalLink from "components/ExternalLink/ExternalLink";
import logoImg from "img/logo_GMX.svg";

type Props = {
  small?: boolean;
  clickCloseIcon?: () => void;
  openSettings?: () => void;
};

export function AppHeaderLinks({ small, openSettings, clickCloseIcon }: Props) {
  return (
    <div className="App-header-links">
      {small && (
        <div className="App-header-links-header">
          <Link className="App-header-link-main" to="/">
            <img src={logoImg} alt="GMX Logo" />
          </Link>
          <div
            className="App-header-menu-icon-block mobile-cross-menu"
            onClick={() => clickCloseIcon && clickCloseIcon()}
          >
            <FiX className="App-header-menu-icon" />
          </div>
        </div>
      )}
      <div className="App-header-link-container">
        <Link to="/dashboard">
          <Trans>Dashboard</Trans>
        </Link>
      </div>
      <div className="App-header-link-container">
        <Link to="/earn">
          <Trans>Earn</Trans>
        </Link>
      </div>
      <div className="App-header-link-container">
        <Link to="/buy">
          <Trans>Buy</Trans>
        </Link>
      </div>
      <div className="App-header-link-container">
        <Link to="/referrals">
          <Trans>Referrals</Trans>
        </Link>
      </div>
      <div className="App-header-link-container">
        <Link to="/ecosystem">
          <Trans>Ecosystem</Trans>
        </Link>
      </div>
      <div className="App-header-link-container">
        <ExternalLink href="https://docs.gmx.io/">
          <Trans>Docs</Trans>
        </ExternalLink>
      </div>
      {small && (
        <div className="App-header-link-container">
          {/* eslint-disable-next-line */}
          <a href="#" onClick={openSettings}>
            <Trans>Settings</Trans>
          </a>
        </div>
      )}
    </div>
  );
}
