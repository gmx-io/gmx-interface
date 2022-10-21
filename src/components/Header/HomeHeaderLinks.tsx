import { FiX } from "react-icons/fi";
import logoImg from "img/logo_GMX.svg";
import { t } from "@lingui/macro";

import "./Header.css";
import { Link } from "react-router-dom";
import ExternalLink from "components/ExternalLink/ExternalLink";

type Props = {
  small?: boolean;
  clickCloseIcon?: () => void;
};

const HOME_MENUS = [
  {
    label: t`GMX Protocol`,
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
    link: "https://gmxio.gitbook.io/gmx/",
  },
];

export function HomeHeaderLinks({ small, clickCloseIcon }: Props) {
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
      {HOME_MENUS.map(({ link, label }) => (
        <div className="App-header-link-container">
          <ExternalLink href={link}>{label}</ExternalLink>
        </div>
      ))}
    </div>
  );
}
