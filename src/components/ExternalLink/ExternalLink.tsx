import React from "react";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

function ExternalLink({ href, children, className }: Props) {
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export default ExternalLink;
