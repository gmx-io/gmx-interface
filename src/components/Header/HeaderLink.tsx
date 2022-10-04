import React, { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import cx from "classnames";
import { getAppBaseUrl, getHomeUrl } from "lib/legacy";

import "./Header.css";
import { isHomeSite, shouldShowRedirectModal } from "lib/legacy";

type Props = {
  isHome?: boolean;
  isHomeLink?: boolean;
  className?: string;
  exact?: boolean;
  to: string;
  shouldShowRedirectModal?: boolean;
  showRedirectModal: (to: string) => void;
  redirectPopupTimestamp: number;
  children?: ReactNode;
};

export function HeaderLink({
  isHomeLink,
  className,
  exact,
  to,
  children,
  redirectPopupTimestamp,
  showRedirectModal,
}: Props) {
  const isOnHomePage = window.location.pathname === "/";
  const isHome = isHomeSite();

  if (isHome && !(isHomeLink && !isOnHomePage)) {
    if (shouldShowRedirectModal(redirectPopupTimestamp)) {
      return (
        <div className={cx("a", className, { active: isHomeLink })} onClick={() => showRedirectModal(to)}>
          {children}
        </div>
      );
    } else {
      const baseUrl = getAppBaseUrl();
      return (
        <a className={cx("a", className, { active: isHomeLink })} href={baseUrl + to}>
          {children}
        </a>
      );
    }
  }

  if (isHomeLink) {
    return (
      <a href={getHomeUrl()} className={cx(className)}>
        {children}
      </a>
    );
  }

  return (
    <NavLink activeClassName="active" className={cx(className)} exact={exact} to={to}>
      {children}
    </NavLink>
  );
}
