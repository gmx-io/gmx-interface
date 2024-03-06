import { ReactNode } from "react";
import Tooltip from "../Tooltip/Tooltip";
import "./Card.css";

type Props = {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  tooltipText?: string;
};

function Card({ title, children, className, tooltipText }: Props) {
  return (
    <div className={`card ${className ? className : ""}`}>
      {tooltipText ? (
        <Tooltip
          handle={<div className="card-header">{title}</div>}
          position="bottom-start"
          renderContent={() => tooltipText}
        />
      ) : (
        <div className="card-header">{title}</div>
      )}
      <div className="card-divider"></div>
      <div className="card-body">{children}</div>
    </div>
  );
}

export default Card;
