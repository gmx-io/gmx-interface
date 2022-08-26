import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import cx from "classnames";
import { getAppBaseUrl, getHomeUrl } from "helpers/Helpers";

import "./Header.css";

type Props = {
  isHome?: boolean;
  isHomeLink?: boolean;
  className?: string;
  exact?: boolean;
  to: string;
  shouldShowRedirectModal?: boolean;
  showRedirectModal?: (to: string) => void;
  children?: ReactNode;
};

export function HeaderLink(p: Props) {
  const isOnHomePage = window.location.pathname === "/";

  if (p.isHome && !(p.isHomeLink && !isOnHomePage)) {
    if (p.shouldShowRedirectModal) {
      return (
        <div
          className={cx("a", p.className, { active: p.isHomeLink })}
          onClick={() => p.showRedirectModal && p.showRedirectModal(p.to)}
        >
          {p.children}
        </div>
      );
    } else {
      const baseUrl = getAppBaseUrl();

      return (
        <a className={cx("a", p.className, { active: p.isHomeLink })} href={baseUrl + p.to}>
          {p.children}
        </a>
      );
    }
  }

  if (p.isHomeLink) {
    return (
      <a href={getHomeUrl()} className={cx(p.className)}>
        {p.children}
      </a>
    );
  }

  return (
    <NavLink activeClassName="active" className={cx(p.className)} exact={p.exact} to={p.to}>
      {p.children}
    </NavLink>
  );
}
