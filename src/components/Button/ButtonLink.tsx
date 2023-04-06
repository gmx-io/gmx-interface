import React, { ReactNode } from "react";
import { Link } from "react-router-dom";
import openInNewTab from "img/open-new-tab.svg";

type ButtonProps = {
  children: ReactNode;
  className: string;
  to: string;
  showExternalLinkArrow: boolean;
  onClick?: () => void;
  newTab?: boolean;
};

export default function ButtonLink({
  className,
  to,
  children,
  onClick,
  showExternalLinkArrow,
  newTab = false,
  ...rest
}: ButtonProps) {
  if (to.startsWith("http") || to.startsWith("https")) {
    const anchorProps = {
      href: to,
      className,
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
    <Link className={className} to={to}>
      {children}
    </Link>
  );
}
