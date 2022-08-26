import { FiX } from "react-icons/fi";
import { HeaderLink } from "./HeaderLink";
import logoImg from "img/logo_GMX.svg";

import "./Header.css";
import { isHomeSite } from "../../helpers/ui/utils";

type Props = {
  small?: boolean;
  clickCloseIcon?: () => void;
  openSettings?: () => void;
};

export function AppHeaderLinks({ small, clickCloseIcon = () => null, openSettings = () => null }: Props) {
  return (
    <div className="App-header-links">
      {small && (
        <div className="App-header-links-header">
          <div className="App-header-menu-icon-block" onClick={() => clickCloseIcon()}>
            <FiX className="App-header-menu-icon" />
          </div>
          <HeaderLink isHomeLink={true} className="App-header-link-main" to="/">
            <img src={logoImg} alt="GMX Logo" />
          </HeaderLink>
        </div>
      )}
      <div className="App-header-link-container App-header-link-home">
        <HeaderLink to="/" exact={true} isHomeLink={true}>
          Home
        </HeaderLink>
      </div>
      <div className="App-header-link-container">
        <HeaderLink to="/dashboard">Dashboard</HeaderLink>
      </div>
      <div className="App-header-link-container">
        <HeaderLink to="/earn">Earn</HeaderLink>
      </div>
      <div className="App-header-link-container">
        <HeaderLink to="/buy">Buy</HeaderLink>
      </div>
      <div className="App-header-link-container">
        <HeaderLink to="/referrals">Referrals</HeaderLink>
      </div>
      <div className="App-header-link-container">
        <HeaderLink to="/ecosystem">Ecosystem</HeaderLink>
      </div>
      <div className="App-header-link-container">
        <a href="https://gmxio.gitbook.io/gmx/" target="_blank" rel="noopener noreferrer">
          About
        </a>
      </div>
      {small && !isHomeSite() && (
        <div className="App-header-link-container">
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
          <a href="#" onClick={openSettings}>
            Settings
          </a>
        </div>
      )}
    </div>
  );
}
