import { useMedia } from "react-use";
import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useState } from "react";
import { NavLink } from "react-router-dom";

import { getAppBaseUrl, isHomeSite, shouldShowRedirectModal } from "lib/legacy";
import { SOCIAL_LINKS, getFooterLinks } from "./constants";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { UserFeedbackModal } from "../UserFeedbackModal/UserFeedbackModal";

import logoImg from "img/ic_gmx_footer.svg";

import { TrackingLink } from "components/TrackingLink/TrackingLink";
import { userAnalytics } from "lib/userAnalytics";
import { LandingPageFooterMenuEvent } from "lib/userAnalytics/types";

type Props = { showRedirectModal?: (to: string) => void; redirectPopupTimestamp?: number };

export default function Footer({ showRedirectModal, redirectPopupTimestamp }: Props) {
  const isHome = isHomeSite();
  const [isUserFeedbackModalVisible, setIsUserFeedbackModalVisible] = useState(false);

  const isMobile = useMedia("(max-width: 1024px)");
  const isVerySmall = useMedia("(max-width: 580px)");

  const linkClassName = cx("cursor-pointer !text-slate-100 !no-underline hover:!text-white ", {
    "text-body-medium": isMobile && !isVerySmall,
    "text-body-small": isVerySmall,
    "text-body-large": !isMobile,
  });

  return (
    <>
      <div
        className={cx(
          "absolute bottom-0 left-[50%]  w-[100%] translate-x-[-50%] border-t border-t-[var(--color-stroke-primary)] px-32 py-40",
          {
            "grid grid-cols-[1fr_2fr_1fr]": !isMobile,
            "flex flex-col gap-20": isMobile,
          }
        )}
      >
        <div
          className={cx("flex items-center", {
            "justify-center": isMobile,
            "justify-start": !isMobile,
          })}
        >
          <img src={logoImg} alt="GMX Logo" width="70" height="16" />
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
                <ExternalLink key={label} href={link} className={linkClassName}>
                  {label}
                </ExternalLink>
              );
            }
            if (isAppLink) {
              if (shouldShowRedirectModal(redirectPopupTimestamp)) {
                return (
                  <div
                    key={label}
                    className={linkClassName}
                    onClick={() => showRedirectModal && showRedirectModal(link)}
                  >
                    {label}
                  </div>
                );
              } else {
                const baseUrl = getAppBaseUrl();
                return (
                  <a key={label} href={baseUrl + link} className={linkClassName}>
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
                <ExternalLink href={platform.link} className="h-24 w-24">
                  <img src={platform.icon} alt={platform.name} width="100%" />
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
