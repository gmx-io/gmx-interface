import { ReactNode } from "react";
import Tooltip from "../Tooltip/Tooltip";
import "./Card.css";

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
  tooltipText?: string;
  footer?: React.ReactNode;
};

function Card({ title, children, className, tooltipText, footer }: Props) {
  return (
    <div className={`card ${className ? className : ""}`}>
      {tooltipText ? (
        <Tooltip
          handle={<div className="card-header">{title}</div>}
          position="left-bottom"
          renderContent={() => tooltipText}
        />
      ) : (
        <div className="card-header">{title}</div>
      )}
      <div className="card-divider"></div>
      <div className="card-body">{children}</div>
      {footer && (
        <>
          <div className="card-divider" />
          {footer}
        </>
      )}
    </div>
  );
}

export default Card;
