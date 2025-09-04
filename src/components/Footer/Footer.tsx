import cx from "classnames";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useMedia } from "react-use";

import { getAppBaseUrl, isHomeSite, shouldShowRedirectModal } from "lib/legacy";

import ExternalLink from "components/ExternalLink/ExternalLink";

import logoImg from "img/logo_GMX.svg";

import { getFooterLinks } from "./constants";
import { UserFeedbackModal } from "../UserFeedbackModal/UserFeedbackModal";

type Props = {
  showRedirectModal?: (to: string) => void;
  redirectPopupTimestamp?: number;
  isMobileTradePage?: boolean;
};

export default function Footer({ showRedirectModal, redirectPopupTimestamp, isMobileTradePage }: Props) {
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
        className={cx(
          "absolute bottom-0 left-0 w-full border-t border-t-stroke-primary px-32 pt-32",
          isMobileTradePage ? "pb-92" : "pb-32",
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
          <img src={logoImg} alt="GMX Logo" />
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
        </div>
        <div
          className={cx("flex gap-24", {
            "justify-center": isMobile,
            "justify-end": !isMobile,
          })}
        ></div>
      </div>
      {!isHome && (
        <UserFeedbackModal isVisible={isUserFeedbackModalVisible} setIsVisible={setIsUserFeedbackModalVisible} />
      )}
    </>
  );
}
