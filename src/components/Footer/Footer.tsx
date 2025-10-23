import { Trans } from "@lingui/macro";
import cx from "classnames";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { getAppBaseUrl, isHomeSite, shouldShowRedirectModal } from "lib/legacy";
import { userAnalytics } from "lib/userAnalytics";
import { LandingPageFooterMenuEvent } from "lib/userAnalytics/types";

import Button from "components/Button/Button";
import { TrackingLink } from "components/TrackingLink/TrackingLink";

import FeedbackIcon from "img/ic_feedback.svg?react";

import { SOCIAL_LINKS, getFooterLinks } from "./constants";
import { UserFeedbackModal } from "../UserFeedbackModal/UserFeedbackModal";

type Props = {
  showRedirectModal?: (to: string) => void;
  redirectPopupTimestamp?: number;
  isMobileSideNav?: boolean;
  disableFeedbackModal?: boolean;
};

export default function Footer({
  showRedirectModal,
  redirectPopupTimestamp,
  isMobileSideNav,
  disableFeedbackModal,
}: Props) {
  const isHome = isHomeSite();
  const { feedbackModalVisible, setFeedbackModalVisible } = useSettings();

  return (
    <>
      <div className={cx("flex w-full justify-between", { "flex-col": isMobileSideNav })}>
        <div className={cx("flex flex-row items-center justify-center", { "flex-wrap": isMobileSideNav })}>
          {getFooterLinks(isHome).map(({ external, label, link, isAppLink }) => {
            if (external) {
              return (
                <Button variant="ghost" key={link} to={link} newTab>
                  {label}
                </Button>
              );
            }
            if (isAppLink) {
              if (shouldShowRedirectModal(redirectPopupTimestamp)) {
                return (
                  <Button variant="ghost" key={link} onClick={() => showRedirectModal && showRedirectModal(link)}>
                    {label}
                  </Button>
                );
              } else {
                const baseUrl = getAppBaseUrl();
                return (
                  <Button variant="ghost" key={link} href={baseUrl + link} newTab>
                    {label}
                  </Button>
                );
              }
            }
            return (
              <Button variant="ghost" key={link} to={link}>
                {label}
              </Button>
            );
          })}
          {!isHome && (
            <Button variant="ghost" onClick={() => setFeedbackModalVisible(true)}>
              {isMobileSideNav ? null : <FeedbackIcon />}
              <Trans>Leave Feedback</Trans>
            </Button>
          )}
        </div>
        <div
          className={cx("flex", {
            "justify-center": isMobileSideNav,
            "justify-end": !isMobileSideNav,
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
                <Button variant="ghost" href={platform.link} newTab>
                  <div className="size-16">{platform.icon}</div>
                </Button>
              </TrackingLink>
            );
          })}
        </div>
      </div>
      {!isHome && !disableFeedbackModal && (
        <UserFeedbackModal isVisible={feedbackModalVisible} setIsVisible={setFeedbackModalVisible} />
      )}
    </>
  );
}
