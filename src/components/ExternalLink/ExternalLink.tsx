import React from "react";
import cx from "classnames";
import "./ExternalLink.scss";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
  newTab?: boolean;
};

function ExternalLink({ href, children, className, newTab = true }: Props) {
  const classNames = cx("link-underline", className);
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
  return <a {...props}>{children}</a>;
}

export default ExternalLink;
