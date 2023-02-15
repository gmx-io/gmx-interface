import { ReactNode } from "react";
import { Link } from "react-router-dom";

type ButtonProps = {
  children: ReactNode;
  className: string;
  to: string;
};

export default function ButtonLink({ className, to, children, ...rest }: ButtonProps) {
  if (to.startsWith("http") || to.startsWith("https")) {
    return (
      <a href={to} className={className} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link className={className} to={to} {...rest}>
      {children}
    </Link>
  );
}
