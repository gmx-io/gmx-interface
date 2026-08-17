import cx from "classnames";

import { userAnalytics } from "lib/userAnalytics";
import { LandingPageFooterMenuEvent } from "lib/userAnalytics/types";

import Button from "components/Button/Button";
import { TrackingLink } from "components/TrackingLink/TrackingLink";

import { getFooterLinks, SOCIAL_LINKS } from "./constants";

type Props = {
  isMobileSideNav?: boolean;
};

export default function Footer({ isMobileSideNav }: Props) {
  return (
    <div className={cx("flex w-full justify-between", { "flex-col": isMobileSideNav })}>
      <div className={cx("flex flex-row items-center justify-center", { "flex-wrap": isMobileSideNav })}>
        {getFooterLinks().map(({ external, label, link }) => {
          if (external) {
            return (
              <Button variant="ghost" key={link} to={link} newTab>
                {label}
              </Button>
            );
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
              <Button variant="ghost" to={platform.link} newTab aria-label={platform.name}>
                <div className="size-16">{platform.icon}</div>
              </Button>
            </TrackingLink>
          );
        })}
      </div>
    </div>
  );
}
