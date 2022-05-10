import React from "react";

import "./Footer.css";

import logoImg from "./img/ic_gmx_footer.svg";
import twitterIcon from "./img/ic_twitter.svg";
import discordIcon from "./img/ic_discord.svg";
import telegramIcon from "./img/ic_telegram.svg";
import githubIcon from "./img/ic_github.svg";
import mediumIcon from "./img/ic_medium.svg";
import { NavLink } from "react-router-dom";

export default function Footer() {
  return (
    <div className="Footer">
      <div className="Footer-wrapper">
        <div className="Footer-logo">
          <img src={logoImg} alt="MetaMask" />
        </div>
        <div className="Footer-social-link-block">
          <a className="App-social-link" href="https://twitter.com/GMX_IO" target="_blank" rel="noopener noreferrer">
            <img src={twitterIcon} alt="Twitter" />
          </a>
          <a className="App-social-link" href="https://medium.com/@gmx.io" target="_blank" rel="noopener noreferrer">
            <img src={mediumIcon} alt="Medium" />
          </a>
          <a className="App-social-link" href="https://github.com/gmx-io" target="_blank" rel="noopener noreferrer">
            <img src={githubIcon} alt="Github" />
          </a>
          <a className="App-social-link" href="https://t.me/GMX_IO" target="_blank" rel="noopener noreferrer">
            <img src={telegramIcon} alt="Telegram" />
          </a>
          <a className="App-social-link" href="https://discord.gg/cxjZYR4gQK" target="_blank" rel="noopener noreferrer">
            <img src={discordIcon} alt="Discord" />
          </a>
        </div>
        <div className="Footer-links">
          <div>
            <NavLink to="/referral-terms" className="Footer-link" activeClassName="active">
              Referral Terms
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
}
