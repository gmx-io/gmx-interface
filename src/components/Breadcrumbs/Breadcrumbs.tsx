import cx from "classnames";
import { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useBreakpoints } from "lib/useBreakpoints";

import ChevronLeftIcon from "img/ic_chevron_left.svg?react";

export type BreadcrumbsProps = {
  children: ReactNode;
  className?: string;
};

export function Breadcrumbs({ children, className }: BreadcrumbsProps) {
  return <nav className={cx("flex items-center gap-20", className)}>{children}</nav>;
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
        `text-slate-300 text-body-small relative inline-flex items-center gap-4 rounded-full border-1/2
        border-stroke-primary px-12 py-8 font-medium transition-colors after:text-body-small after:absolute after:-left-12
        after:top-[50%] after:translate-y-[-50%] after:text-textIcon-inactive after:content-['/']
        first:after:content-none max-md:px-8`,
        {
          "cursor-pointer text-textIcon-secondary hover:bg-fill-surfaceElevated hover:text-textIcon-primary": !active,
          "cursor-default text-textIcon-primary": active,
        },
        className
      )}
    >
      {back && <ChevronLeftIcon className="size-16" />}
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
