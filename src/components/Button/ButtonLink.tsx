import cx from "classnames";
import React, { ReactNode } from "react";
import { Link } from "react-router-dom";

import openInNewTab from "img/open-new-tab.svg";

type ButtonProps = {
  children: ReactNode;
  className?: string;
  to: string;
  showExternalLinkArrow?: boolean;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  newTab?: boolean;
  disabled?: boolean;
  qa?: string;
};

function preventClick(e: React.MouseEvent<HTMLElement>) {
  e.preventDefault();
}

export default function ButtonLink({
  className,
  to,
  children,
  onClick,
  showExternalLinkArrow,
  newTab = false,
  disabled = false,
  qa,
  ...rest
}: ButtonProps) {
  const classNames = cx(className, { disabled: disabled });
  if (to.startsWith("http") || to.startsWith("https")) {
    const anchorProps = {
      href: disabled ? undefined : to,
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
      <a data-qa={qa} {...anchorProps}>
        {showExternalLinkArrow && <img className="arrow-icon" src={openInNewTab} width="100%" alt="open in new tab" />}
        {children}
      </a>
    );
  }
  return (
    <Link data-qa={qa} className={classNames} to={to} onClick={disabled ? preventClick : onClick}>
      {children}
    </Link>
  );
}
