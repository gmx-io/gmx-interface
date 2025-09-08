import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useMedia } from "react-use";

import { getAppBaseUrl, isHomeSite, shouldShowRedirectModal } from "lib/legacy";
import { userAnalytics } from "lib/userAnalytics";
import { LandingPageFooterMenuEvent } from "lib/userAnalytics/types";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { SOCIAL_LINKS, getFooterLinks } from "components/Footer/constants";
import { TrackingLink } from "components/TrackingLink/TrackingLink";
import { UserFeedbackModal } from "components/UserFeedbackModal/UserFeedbackModal";

import LogoImg from "img/logo_GMX.svg?react";

type Props = {
  showRedirectModal?: (to: string) => void;
  redirectPopupTimestamp?: number;
  isMobileTradePage?: boolean;
};

export default function HomeFooter({ showRedirectModal, redirectPopupTimestamp, isMobileTradePage }: Props) {
  const isHome = isHomeSite();
  const [isUserFeedbackModalVisible, setIsUserFeedbackModalVisible] = useState(false);

  const isMobile = useMedia("(max-width: 1024px)");
  const isVerySmall = useMedia("(max-width: 580px)");

  const linkClassName = cx("cursor-pointer !text-slate-100 !no-underline hover:!text-white ", {
    "text-body-medium": !isVerySmall,
    "text-body-small": isVerySmall,
  });

  return (
    <>
      <div
        className={cx("w-full border-t border-t-slate-600 px-32 pt-32", isMobileTradePage ? "pb-92" : "pb-32", {
          "grid grid-cols-[1fr_2fr_1fr]": !isMobile,
          "flex flex-col gap-20": isMobile,
        })}
      >
        <div
          className={cx("flex items-center", {
            "justify-center": isMobile,
            "justify-start": !isMobile,
          })}
        >
          <LogoImg />
        </div>
        <div
          className={cx("flex flex-row items-center justify-center", {
            "gap-32": !isMobile,
            "gap-24": isMobile && !isVerySmall,
            "gap-16": isVerySmall,
          })}
        >
          {getFooterLinks(isHome).map(({ external, label, link, isAppLink }) => {
            if (external) {
              return (
                <ExternalLink key={link} href={link} className={linkClassName}>
                  {label}
                </ExternalLink>
              );
            }
            if (isAppLink) {
              if (shouldShowRedirectModal(redirectPopupTimestamp)) {
                return (
                  <div
                    key={link}
                    className={linkClassName}
                    onClick={() => showRedirectModal && showRedirectModal(link)}
                  >
                    {label}
                  </div>
                );
              } else {
                const baseUrl = getAppBaseUrl();
                return (
                  <a key={link} href={baseUrl + link} className={linkClassName}>
                    {label}
                  </a>
                );
              }
            }
            return (
              <NavLink key={link} to={link} className={linkClassName} activeClassName="active">
                {label}
              </NavLink>
            );
          })}
          {!isHome && (
            <div className={linkClassName} onClick={() => setIsUserFeedbackModalVisible(true)}>
              <Trans>Leave feedback</Trans>
            </div>
          )}
        </div>
        <div
          className={cx("flex gap-24", {
            "justify-center": isMobile,
            "justify-end": !isMobile,
          })}
        >
          {SOCIAL_LINKS.map((platform) => {
            return (
              <TrackingLink
                key={platform.name}
                onClick={async () => {
                  await userAnalytics.pushEvent<LandingPageFooterMenuEvent>(
                    {
                      event: "LandingPageAction",
                      data: {
                        action: "FooterMenu",
                        button: platform.name,
                      },
                    },
                    { instantSend: true }
                  );
                }}
              >
                <ExternalLink href={platform.link} className="h-16 w-16">
                  {platform.icon}
                </ExternalLink>
              </TrackingLink>
            );
          })}
        </div>
      </div>
      {!isHome && (
        <UserFeedbackModal isVisible={isUserFeedbackModalVisible} setIsVisible={setIsUserFeedbackModalVisible} />
      )}
    </>
  );
}
