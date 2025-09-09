import { Trans } from "@lingui/macro";
import { FiX } from "react-icons/fi";
import { Link } from "react-router-dom";

import logoImg from "img/logo_GMX.svg";

import { HeaderLink } from "./HeaderLink";

import "./Header.scss";

type Props = {
  small?: boolean;
  clickCloseIcon?: () => void;
  showRedirectModal: (to: string) => void;
};

export function AppHeaderLinks({ small, clickCloseIcon, showRedirectModal }: Props) {
  return (
    <div className="App-header-links">
      {small && (
        <div className="App-header-links-header">
          <Link className="App-header-link-main" to="/">
            <img src={logoImg} alt="GMX Logo" />
          </Link>
          <div
            className="App-header-menu-icon-block max-w-[450px]:mr-12 mr-8 !border-0"
            onClick={() => clickCloseIcon && clickCloseIcon()}
          >
            <FiX className="App-header-menu-icon" />
          </div>
        </div>
      )}
      <div className="App-header-link-container">
        <HeaderLink qa="trade" to="/v1" showRedirectModal={showRedirectModal}>
          <Trans>Trade</Trans>
        </HeaderLink>
      </div>
      <div className="App-header-link-container">
        <HeaderLink qa="buy" to="/sell_glp" showRedirectModal={showRedirectModal}>
          <Trans>Redeem GLP</Trans>
        </HeaderLink>
      </div>
      <div className="App-header-link-container">
        <HeaderLink qa="stake" to="/earn" showRedirectModal={showRedirectModal}>
          <Trans>Vault</Trans>
        </HeaderLink>
      </div>
    </div>
  );
}
