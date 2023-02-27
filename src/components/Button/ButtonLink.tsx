import React, { ReactNode } from "react";
import { Link } from "react-router-dom";

type ButtonProps = {
  children: ReactNode;
  className: string;
  to: string;
  key?: React.Key;
};

export default function ButtonLink({ className, to, children, key }: ButtonProps) {
  if (to.startsWith("http") || to.startsWith("https")) {
    return (
      <a href={to} className={className} target="_blank" rel="noopener noreferrer" key={key}>
        {children}
      </a>
    );
  }
  return (
    <Link className={className} to={to} key={key}>
      {children}
    </Link>
  );
}
