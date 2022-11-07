import React from "react";
import cx from "classnames";
import "./Footer.css";
import logoImg from "img/ic_gmx_footer.svg";
import { NavLink } from "react-router-dom";
import { isHomeSite, getAppBaseUrl, shouldShowRedirectModal } from "lib/legacy";
import { FOOTER_LINKS, SOCIAL_LINKS } from "./constants";

type Props = { showRedirectModal?: (to: string) => void; redirectPopupTimestamp?: () => void };

export default function Footer({ showRedirectModal, redirectPopupTimestamp }: Props) {
  const isHome = isHomeSite();

  return (
    <div className="Footer">
      <div className={cx("Footer-wrapper", { home: isHome })}>
        <div className="Footer-logo">
          <img src={logoImg} alt="MetaMask" />
        </div>
        <div className="Footer-social-link-block">
          {SOCIAL_LINKS.map((platform) => {
            return (
              <a
                key={platform.name}
                className="App-social-link"
                href={platform.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={platform.icon} alt={platform.name} />
              </a>
            );
          })}
        </div>
        <div className="Footer-links">
          {FOOTER_LINKS[isHome ? "home" : "app"].map(({ external, text, link, isAppLink }) => {
            if (external) {
              return (
                <a key={text} target="_blank" href={link} className="Footer-link" rel="noopener noreferrer">
                  {text}
                </a>
              );
            }
            if (isAppLink) {
              if (shouldShowRedirectModal(redirectPopupTimestamp)) {
                return (
                  <div
                    key={text}
                    className="Footer-link a"
                    onClick={() => showRedirectModal && showRedirectModal(link)}
                  >
                    {text}
                  </div>
                );
              } else {
                const baseUrl = getAppBaseUrl();
                return (
                  <a key={text} href={baseUrl + link} className="Footer-link">
                    {text}
                  </a>
                );
              }
            }
            return (
              <NavLink key={link} to={link} className="Footer-link" activeClassName="active">
                {text}
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}
