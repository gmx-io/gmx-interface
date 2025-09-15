import cx from "classnames";
import { ReactNode } from "react";
import { FaChevronLeft } from "react-icons/fa6";
import { Link } from "react-router-dom";

import { useBreakpoints } from "lib/useBreakpoints";

export type BreadcrumbsProps = {
  children: ReactNode;
  className?: string;
};

export function Breadcrumbs({ children, className }: BreadcrumbsProps) {
  return <nav className={cx("flex items-center gap-21", className)}>{children}</nav>;
}

export type BreadcrumbItemProps = {
  to?: string;
  children: ReactNode;
  back?: boolean;
  active?: boolean;
  onClick?: () => void;
  className?: string;
};

export function BreadcrumbItem({ to: href, children, back, active, onClick, className }: BreadcrumbItemProps) {
  const { isMobile, isTablet } = useBreakpoints();

  if (!back && isTablet) {
    return null;
  }

  const content = (
    <div
      className={cx(
        `text-slate-300 relative inline-flex items-center gap-6 rounded-full border-1/2 border-slate-600
        px-12 py-8 text-13 font-medium leading-[1.15] transition-colors after:absolute after:-left-13 after:top-[50%]
        after:translate-y-[-50%] after:text-11 after:text-slate-600 after:content-['/']
        first:after:content-none max-md:px-8`,
        {
          "cursor-pointer text-typography-secondary hover:bg-slate-800 hover:text-typography-primary": !active,
          "cursor-default text-typography-primary": active,
        },
        className
      )}
    >
      {back && <FaChevronLeft className="text-12" />}
      {!isMobile ? children : null}
    </div>
  );

  if (!active && href) {
    return (
      <Link to={href} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return content;
}
