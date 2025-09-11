import cx from "classnames";
import React from "react";

import NewLinkIcon from "img/ic_new_link.svg?react";

import "./ExternalLink.scss";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
  newTab?: boolean;
  variant?: "underline" | "icon";
};

function ExternalLink({ href, children, className, newTab = true, variant = "underline" }: Props) {
  const classNames = cx("link-underline", className, {
    "!no-underline": variant !== "underline",
  });
  const props = {
    href,
    className: classNames,
    ...(newTab
      ? {
          target: "_blank",
          rel: "noopener noreferrer",
        }
      : {}),
  };
  return (
    <a {...props}>
      {children}{" "}
      {variant === "icon" && <NewLinkIcon className="ml-4 mt-3 size-12 shrink-0 self-baseline align-baseline" />}
    </a>
  );
}

export default ExternalLink;
