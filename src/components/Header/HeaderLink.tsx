import cx from "classnames";
import { MouseEventHandler, ReactNode } from "react";
import { NavLink, NavLinkProps } from "react-router-dom";

import { getAppBaseUrl, getHomeUrl } from "lib/legacy";
import { isHomeSite, shouldShowRedirectModal } from "lib/legacy";
import { useRedirectPopupTimestamp } from "lib/useRedirectPopupTimestamp";

import { TrackingLink } from "components/TrackingLink/TrackingLink";
import "./Header.scss";

type Props = {
  isHomeLink?: boolean;
  className?: string;
  exact?: boolean;
  to: string;
  showRedirectModal: (to: string) => void;
  onClick?: MouseEventHandler<HTMLDivElement | HTMLAnchorElement>;
  children?: ReactNode;
  isActive?: NavLinkProps["isActive"];
  qa?: string;
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
  qa,
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

      const LinkComponent = (
        <a className={cx("a", className, { active: isHomeLink })} href={baseUrl + to}>
          {children}
        </a>
      );

      return onClick ? <TrackingLink onClick={onClick}>{LinkComponent}</TrackingLink> : LinkComponent;
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
      data-qa={qa}
    >
      {children}
    </NavLink>
  );
}
