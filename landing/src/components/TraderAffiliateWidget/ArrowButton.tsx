import cx from "classnames";

import IcBtnArrow from "img/trader_affiliate_btn_arrow.svg?react";

type Props = {
  label: React.ReactNode;
  variant: "primary" | "secondary";
  className?: string;
  onClick?: () => void;
  href?: string;
};

export function ArrowButton({ label, variant, className, onClick, href }: Props) {
  const rootClassName = cx(
    "relative block h-60 rounded-12 text-left text-16 font-medium -tracking-[0.512px]",
    variant === "primary"
      ? "btn-landing"
      : "duration-180 text-light-150 bg-slate-600/50 transition-colors hover:bg-slate-600/70",
    className
  );

  const content = (
    <>
      <span className="absolute bottom-12 left-12">{label}</span>
      <span
        className={cx(
          "absolute right-8 top-8 flex size-16 items-center justify-center rounded-full",
          variant === "primary" ? "bg-white text-blue-400" : "bg-light-150 text-black"
        )}
      >
        <IcBtnArrow className="size-8" />
      </span>
    </>
  );

  if (href !== undefined) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={rootClassName}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={rootClassName}>
      {content}
    </button>
  );
}
