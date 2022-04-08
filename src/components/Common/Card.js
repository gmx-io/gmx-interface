import "./Card.css";

function Card({ title, children }) {
  return (
    <div className="card">
      <div className="card-header">{title}</div>
      <div className="card-divider"></div>
      <div className="card-body">{children}</div>
    </div>
  );
}

export default Card;
