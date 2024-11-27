import React from "react";
import cx from "classnames";
import "./ExternalLink.scss";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;

function ExternalLink({ href, children, className, ...props }: Props) {
  const classNames = cx("link-underline", className);
  return (
    <a href={href} className={classNames} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}

export default ExternalLink;
