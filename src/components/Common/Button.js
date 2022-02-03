import "./Button.css";

function Button({ href, imgSrc, children, onClick }) {
  if (href) {
    return (
      <a
        className="btn btn-primary"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {imgSrc && <img src={imgSrc} alt={children} />}
        <span>{children}</span>
      </a>
    );
  }
  return (
    <button className="btn btn-primary" onClick={onClick}>
      {imgSrc && <img src={imgSrc} alt={children} />}
      <span>{children}</span>
    </button>
  );
}

export default Button;
