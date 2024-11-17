import { FiX } from "react-icons/fi";
import logoImg from "img/logo_GMX.svg";
import { t } from "@lingui/macro";

import "./Header.scss";
import { Link } from "react-router-dom";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { HeaderLink } from "./HeaderLink";
import { userAnalytics } from "lib/userAnalytics";
import { LandingPageLaunchAppEvent } from "lib/userAnalytics/types";

type Props = {
  small?: boolean;
  clickCloseIcon?: () => void;
  showRedirectModal: (to: string) => void;
};

type HomeLink = { label: string; link: string; isHomeLink?: boolean | false; onClick?: () => void };

export function HomeHeaderLinks({ small, clickCloseIcon, showRedirectModal }: Props) {
  const HOME_MENUS: HomeLink[] = [
    {
      label: t`App`,
      isHomeLink: true,
      link: "/trade",
      onClick: () => {
        userAnalytics.pushEvent<LandingPageLaunchAppEvent>({
          event: "LandingPageAction",
          data: {
            action: "LaunchApp",
            buttonPosition: "MenuButton",
          },
        });
      },
    },
    {
      label: t`Protocol`,
      link: "https://github.com/gmx-io",
    },
    {
      label: t`Governance`,
      link: "https://gov.gmx.io/",
    },
    {
      label: t`Voting`,
      link: "https://snapshot.org/#/gmx.eth",
    },
    {
      label: t`Docs`,
      link: "https://docs.gmx.io/",
    },
  ];
  return (
    <div className="App-header-links">
      {small && (
        <div className="App-header-links-header">
          <Link className="App-header-link-main" to="/">
            <img src={logoImg} alt="GMX Logo" />
          </Link>
          <div
            className="App-header-menu-icon-block mobile-cross-menu"
            onClick={() => clickCloseIcon && clickCloseIcon()}
          >
            <FiX className="App-header-menu-icon" />
          </div>
        </div>
      )}
      {HOME_MENUS.map(({ link, label, isHomeLink = false, onClick }) => {
        return (
          <div key={label} className="App-header-link-container">
            {isHomeLink ? (
              <HeaderLink onClick={onClick} to={link} showRedirectModal={showRedirectModal}>
                {label}
              </HeaderLink>
            ) : (
              <ExternalLink href={link}>{label}</ExternalLink>
            )}
          </div>
        );
      })}
    </div>
  );
}
