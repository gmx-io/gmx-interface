import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useMedia } from "react-use";

import { getAppBaseUrl, isHomeSite, shouldShowRedirectModal } from "lib/legacy";
import { userAnalytics } from "lib/userAnalytics";
import { LandingPageFooterMenuEvent } from "lib/userAnalytics/types";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { TrackingLink } from "components/TrackingLink/TrackingLink";

import FeedbackIcon from "img/ic_feedback.svg?react";

import { SOCIAL_LINKS, getFooterLinks } from "./constants";
import { UserFeedbackModal } from "../UserFeedbackModal/UserFeedbackModal";

type Props = {
  showRedirectModal?: (to: string) => void;
  redirectPopupTimestamp?: number;
  isMobileTradePage?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function Footer({ showRedirectModal, redirectPopupTimestamp, isMobileTradePage }: Props) {
  const isHome = isHomeSite();
  const [isUserFeedbackModalVisible, setIsUserFeedbackModalVisible] = useState(false);

  const isMobile = useMedia("(max-width: 1024px)");
  const isVerySmall = useMedia("(max-width: 580px)");

  const linkClassName = cx(
    "flex cursor-pointer items-center gap-4 px-12 py-8 text-[13px] !text-slate-100 !no-underline hover:!text-white",
    {
      "text-body-medium": !isVerySmall,
      "text-body-small": isVerySmall,
    }
  );

  return (
    <>
      <div className="flex w-full justify-between">
        <div className="flex flex-row items-center justify-center">
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
              <FeedbackIcon />
              <Trans>Leave feedback</Trans>
            </div>
          )}
        </div>
        <div
          className={cx("flex", {
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
                <ExternalLink href={platform.link} className="flex h-32 w-40 items-center justify-center">
                  <div className="h-16 w-16">{platform.icon}</div>
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
