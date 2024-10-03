import { ReactNode } from "react";
import cx from "classnames";

import Tooltip from "../Tooltip/Tooltip";

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
        <Tooltip
          handle={<div className={cx("card-header", slimHeader ? "px-16 py-8" : "p-16")}>{title}</div>}
          position="bottom-start"
          content={tooltipText}
        />
      ) : (
        <div className={cx("card-header", slimHeader ? "px-16 py-8" : "p-16")}>{title}</div>
      )}
      {divider && <div className="card-divider" />}
      <div className={bodyPadding ? "card-body" : ""}>{children}</div>
    </div>
  );
}

export default Card;
