import React from "react";
import "./Footer.css";
import logoImg from "./img/ic_gmx_footer.svg";
import twitterIcon from "./img/ic_twitter.svg";
import discordIcon from "./img/ic_discord.svg";
import telegramIcon from "./img/ic_telegram.svg";
import githubIcon from "./img/ic_github.svg";
import mediumIcon from "./img/ic_medium.svg";
import { NavLink } from "react-router-dom";
import { isHomeSite, getAppBaseUrl } from "./Helpers";

const fotterLinks = {
  home: [
    { text: "Media Kit", link: "https://gmxio.gitbook.io/gmx/media-kit", external: true },
    { text: "Terms and Conditions", link: "/terms-and-conditions" },
    { text: "Referral Terms", link: "/referral-terms" },
    { text: "Jobs", link: getAppBaseUrl() + "/jobs", external: true },
  ],
  app: [
    { text: "Media Kit", link: "https://gmxio.gitbook.io/gmx/media-kit", external: true },
    { text: "Jobs", link: "/jobs" },
  ],
};

export default function Footer() {
  const isHome = isHomeSite();

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
          {fotterLinks[isHome ? "home" : "app"].map(({ external, text, link }) => {
            if (external) {
              return (
                <a target="_blank" href={link} className="Footer-link" rel="noopener noreferrer">
                  {text}
                </a>
              );
            }
            return (
              <NavLink to={link} className="Footer-link" activeClassName="active">
                {text}
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}
