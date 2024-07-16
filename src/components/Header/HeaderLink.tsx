import React, { MouseEventHandler, ReactNode } from "react";
import { NavLink, NavLinkProps } from "react-router-dom";
import cx from "classnames";
import { getAppBaseUrl, getHomeUrl } from "lib/legacy";

import "./Header.scss";
import { isHomeSite, shouldShowRedirectModal } from "lib/legacy";
import { useRedirectPopupTimestamp } from "lib/useRedirectPopupTimestamp";

type Props = {
  isHomeLink?: boolean;
  className?: string;
  exact?: boolean;
  to: string;
  showRedirectModal: (to: string) => void;
  onClick?: MouseEventHandler<HTMLDivElement | HTMLAnchorElement>;
  children?: ReactNode;
  isActive?: NavLinkProps["isActive"];
};

export function HeaderLink({
  isHomeLink,
  className,
  exact,
  to,
  children,
  showRedirectModal,
  onClick,
  isActive,
}: Props) {
  const isOnHomePage = window.location.pathname === "/";
  const isHome = isHomeSite();
  const [redirectPopupTimestamp] = useRedirectPopupTimestamp();

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
    <NavLink
      isActive={isActive}
      activeClassName="active"
      className={cx(className)}
      exact={exact}
      to={to}
      onClick={onClick}
    >
      {children}
    </NavLink>
  );
}
