import Tooltip from "../Tooltip/Tooltip";
import "./Card.css";

function Card({ title, children, className, tooltipText }) {
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
    </div>
  );
}

export default Card;
