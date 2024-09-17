import { ReactNode } from "react";
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
};

function Card({ title, children, className, tooltipText, bodyPadding = true, divider = true }: Props) {
  return (
    <div className={`card ${className ? className : ""}`}>
      {tooltipText ? (
        <Tooltip handle={<div className="card-header">{title}</div>} position="bottom-start" content={tooltipText} />
      ) : (
        <div className="card-header">{title}</div>
      )}
      {divider && <div className="card-divider" />}
      <div className={bodyPadding ? "card-body" : ""}>{children}</div>
    </div>
  );
}

export default Card;
