import cx from "classnames";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { getAppBaseUrl, shouldShowRedirectModal } from "lib/legacy";
import { userAnalytics } from "lib/userAnalytics";
import { LandingPageFooterMenuEvent } from "lib/userAnalytics/types";

import Button from "components/Button/Button";
import { TrackingLink } from "components/TrackingLink/TrackingLink";

import { FOOTER_LINKS, SOCIAL_LINKS } from "./constants";
import { UserFeedbackModal } from "../UserFeedbackModal/UserFeedbackModal";

type Props = {
  showRedirectModal?: (to: string) => void;
  redirectPopupTimestamp?: number;
  isMobileSideNav?: boolean;
};

export default function Footer({
  showRedirectModal,
  redirectPopupTimestamp,
  isMobileSideNav,
}: Props) {
  const { feedbackModalVisible, setFeedbackModalVisible } = useSettings();

  return (
    <>
      <div className={cx("flex w-full justify-between", { "flex-col": isMobileSideNav })}>
        <div className={cx("flex flex-row items-center justify-center", { "flex-wrap": isMobileSideNav })}>
          {FOOTER_LINKS.map(({ external, label, link, isAppLink }) => {
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
      <UserFeedbackModal isVisible={feedbackModalVisible} setIsVisible={setFeedbackModalVisible} />
    </>
  );
}
