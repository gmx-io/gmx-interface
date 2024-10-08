import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useState } from "react";
import { NavLink } from "react-router-dom";

import { getAppBaseUrl, isHomeSite, shouldShowRedirectModal } from "lib/legacy";
import { SOCIAL_LINKS, getFooterLinks } from "./constants";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { UserFeedbackModal } from "../UserFeedbackModal/UserFeedbackModal";

import logoImg from "img/ic_gmx_footer.svg";

import "./Footer.css";

type Props = { showRedirectModal?: (to: string) => void; redirectPopupTimestamp?: number };

export default function Footer({ showRedirectModal, redirectPopupTimestamp }: Props) {
  const isHome = isHomeSite();
  const [isUserFeedbackModalVisible, setIsUserFeedbackModalVisible] = useState(false);

  return (
    <div className={cx("Footer-wrapper", { home: isHome })}>
      <div className="Footer-logo">
        <img src={logoImg} alt="MetaMask" />
      </div>
      <div className="Footer-social-link-block">
        {SOCIAL_LINKS.map((platform) => {
          return (
            <ExternalLink key={platform.name} className="App-social-link" href={platform.link}>
              <img src={platform.icon} alt={platform.name} />
            </ExternalLink>
          );
        })}
      </div>
      <div className="Footer-links">
        {getFooterLinks(isHome).map(({ external, label, link, isAppLink }) => {
          if (external) {
            return (
              <ExternalLink key={label} href={link} className="Footer-link">
                {label}
              </ExternalLink>
            );
          }
          if (isAppLink) {
            if (shouldShowRedirectModal(redirectPopupTimestamp)) {
              return (
                <div key={label} className="Footer-link a" onClick={() => showRedirectModal && showRedirectModal(link)}>
                  {label}
                </div>
              );
            } else {
              const baseUrl = getAppBaseUrl();
              return (
                <a key={label} href={baseUrl + link} className="Footer-link">
                  {label}
                </a>
              );
            }
          }
          return (
            <NavLink key={link} to={link} className="Footer-link" activeClassName="active">
              {label}
            </NavLink>
          );
        })}
        {!isHome && (
          <div className="Footer-link" onClick={() => setIsUserFeedbackModalVisible(true)}>
            <Trans>Leave feedback</Trans>
          </div>
        )}
      </div>
      {!isHome && (
        <UserFeedbackModal isVisible={isUserFeedbackModalVisible} setIsVisible={setIsUserFeedbackModalVisible} />
      )}
    </div>
  );
}
