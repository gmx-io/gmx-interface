import "./Card.css";

function Card({ title, children, className }) {
  return (
    <div className={`card ${className ? className : ""}`}>
      <div className="card-header">{title}</div>
      <div className="card-divider"></div>
      <div className="card-body">{children}</div>
    </div>
  );
}

export default Card;
