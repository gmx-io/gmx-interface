import cx from "classnames";
import { ReactNode } from "react";

import StandardTooltip from "components/Tooltip/StandardTooltip";

import "./Card.css";

type Props = {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  tooltipText?: string;
  /**
   * @default true
   */
  bodyPadding?: boolean;
  /**
   * @default true
   */
  divider?: boolean;
  slimHeader?: boolean;
};

function Card({
  title,
  children,
  className,
  tooltipText,
  bodyPadding = true,
  divider = true,
  slimHeader = false,
}: Props) {
  return (
    <div className={`card ${className ? className : ""}`}>
      {tooltipText ? (
        <StandardTooltip
          handle={<div className={cx("card-header pr-4", slimHeader ? "px-20 py-8" : "p-20")}>{title}</div>}
          content={tooltipText}
          variant="iconStroke"
          iconClassName="text-typography-secondary"
        />
      ) : (
        <div className={cx("card-header border-b-1/2 border-slate-600", slimHeader ? "px-20 py-8" : "p-20")}>
          {title}
        </div>
      )}
      {divider && <div className="card-divider" />}
      <div className={bodyPadding ? "card-body" : ""}>{children}</div>
    </div>
  );
}

export default Card;
