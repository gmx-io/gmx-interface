import { t } from "@lingui/macro";
import cx from "classnames";
import React, { ReactNode } from "react";
import { Link } from "react-router-dom";

type ButtonProps = {
  children: ReactNode;
  className?: string;
  to: string;

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
      onClick: disabled ? undefined : onClick,
      ...rest,
      ...(disabled ? { role: "link", "aria-disabled": true } : {}),
      ...(newTab
        ? {
            target: "_blank",
            rel: "noopener",
          }
        : {}),
    };
    return (
      <a data-qa={qa} {...anchorProps}>
        {children}
        {newTab && <span className="sr-only"> {t`(opens in a new tab)`}</span>}
      </a>
    );
  }
  return (
    <Link data-qa={qa} className={classNames} to={to} onClick={disabled ? preventClick : onClick} {...rest}>
      {children}
    </Link>
  );
}
