import React, { MouseEventHandler, ReactNode } from "react";
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
  onClick?: MouseEventHandler<HTMLDivElement | HTMLAnchorElement>;
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
  onClick,
}: Props) {
  const isOnHomePage = window.location.pathname === "/";
  const isHome = isHomeSite();

  if (isHome && !(isHomeLink && !isOnHomePage)) {
    if (shouldShowRedirectModal(redirectPopupTimestamp)) {
      return (
        <div
          className={cx("a", className, { active: isHomeLink })}
          onClick={(e) => {
            if (onClick) {
              onClick(e);
            }
            showRedirectModal(to);
          }}
        >
          {children}
        </div>
      );
    } else {
      const baseUrl = getAppBaseUrl();
      return (
        <a className={cx("a", className, { active: isHomeLink })} href={baseUrl + to} onClick={onClick}>
          {children}
        </a>
      );
    }
  }

  if (isHomeLink) {
    return (
      <a href={getHomeUrl()} className={cx(className)} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <NavLink activeClassName="active" className={cx(className)} exact={exact} to={to} onClick={onClick}>
      {children}
    </NavLink>
  );
}
