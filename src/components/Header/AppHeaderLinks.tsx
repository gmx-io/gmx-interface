import React from "react";
import { FiArrowLeft, FiExternalLink } from "react-icons/fi";
import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";

import { HeaderLink } from "./HeaderLink";
import "./Header.css";
import { isHomeSite } from "lib/legacy";
import ExternalLink from "components/ExternalLink/ExternalLink";
import logoImgLight from "img/logo_t3-light.svg";
import logoImgDark from "img/logo_t3-dark.svg";
import { ThemeContext } from "store/theme-provider";

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
  showRedirectModal,
}: Props) {
  const themeContext = React.useContext(ThemeContext);
  return (
    <div className="App-header-links">
      {small && (
        <div className="App-header-links-header">
          <Link className="App-header-link-main" to="/">
            <img src={themeContext.theme === "light" ? logoImgLight : logoImgDark} alt="t3 Logo" />
          </Link>
          <div
            className="App-header-menu-icon-block mobile-cross-menu"
            onClick={() => clickCloseIcon && clickCloseIcon()}
          >
            <FiArrowLeft className="App-header-menu-icon" />
          </div>
        </div>
      )}
      <div className="App-header-link-container" data-tour="step-1" style={{ display: "flex", alignItems: "center" }}>
        <HeaderLink
          to="/trade"
          redirectPopupTimestamp={redirectPopupTimestamp}
          showRedirectModal={showRedirectModal}
          style={{ width: "100%" }}
        >
          <Trans>Trade</Trans>
        </HeaderLink>
      </div>
      <div className="App-header-link-container" data-tour="step-2" style={{ display: "flex", alignItems: "center" }}>
        <HeaderLink
          to="/earn"
          redirectPopupTimestamp={redirectPopupTimestamp}
          showRedirectModal={showRedirectModal}
          style={{ width: "100%" }}
        >
          <Trans>Earn</Trans>
        </HeaderLink>
      </div>
      <div className="App-header-link-container" style={{ display: "flex", alignItems: "center" }}>
        <HeaderLink
          to="/swap"
          redirectPopupTimestamp={redirectPopupTimestamp}
          showRedirectModal={showRedirectModal}
          style={{ width: "100%" }}
        >
          <Trans>Swap</Trans>
        </HeaderLink>
      </div>
      <div className="App-header-link-container" style={{ display: "flex", alignItems: "center" }}>
        <HeaderLink
          style={{ width: "100%" }}
          to="/dashboard"
          redirectPopupTimestamp={redirectPopupTimestamp}
          showRedirectModal={showRedirectModal}
        >
          <Trans>Dashboard</Trans>
        </HeaderLink>
      </div>
      <div className="App-header-link-container">
        <ExternalLink href="https://docs.t3.money/dex/" style={{ display: "flex", alignItems: "center" }}>
          <Trans>Docs</Trans> <FiExternalLink fontSize={14} style={{ marginLeft: "0.5rem", opacity: 0.25 }} />
        </ExternalLink>
      </div>
      {small && !isHomeSite() && (
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
