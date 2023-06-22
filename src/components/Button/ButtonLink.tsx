import React, { ReactNode } from "react";
import { Link } from "react-router-dom";
import cx from "classnames";
import openInNewTab from "img/open-new-tab.svg";

type ButtonProps = {
  children: ReactNode;
  className: string;
  to: string;
  showExternalLinkArrow: boolean;
  onClick?: () => void;
  newTab?: boolean;
  disabled?: boolean;
};

export default function ButtonLink({
  className,
  to,
  children,
  onClick,
  showExternalLinkArrow,
  newTab = false,
  disabled = false,
  ...rest
}: ButtonProps) {
  const classNames = cx(className, { disabled: disabled });
  if (to.startsWith("http") || to.startsWith("https")) {
    const anchorProps = {
      href: to,
      className: classNames,
      onClick,
      ...rest,
      ...(newTab
        ? {
            target: "_blank",
            rel: "noopener",
          }
        : {}),
    };
    return (
      <a {...anchorProps}>
        {showExternalLinkArrow && <img className="arrow-icon" src={openInNewTab} width="100%" alt="open in new tab" />}
        {children}
      </a>
    );
  }
  return (
    <Link className={classNames} to={to}>
      {children}
    </Link>
  );
}
