import cx from "classnames";

import IcLinkArrow from "img/ic_link_arrow.svg?react";

type Props = {
  href: string;
  variant: "primary" | "secondary";
  className?: string;
  children: React.ReactNode;
};

export function ArrowButton({ href, variant, className, children }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cx(
        "relative flex h-60 items-end rounded-12 px-12 pb-12 text-16 font-medium",
        variant === "primary"
          ? "btn-landing"
          : "duration-180 text-light-150 bg-slate-600/50 transition-colors hover:bg-slate-600/60",
        className
      )}
    >
      {children}
      <span
        className={cx(
          "absolute right-8 top-8 flex size-16 items-center justify-center rounded-full",
          variant === "primary" ? "bg-white" : "bg-light-150"
        )}
      >
        <IcLinkArrow className="size-8 text-black" />
      </span>
    </a>
  );
}
