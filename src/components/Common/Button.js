import cx from "classnames";
import "./Button.css";

function Button({ href, imgSrc, children, onClick, label, align = "center" }) {
  if (typeof children === "object") {
    return (
      <a
        className={cx(
          "btn btn-primary",
          align === "left" ? "btn-left" : "btn-center"
        )}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  }

  if (href) {
    return (
      <a
        className={cx(
          "btn btn-primary",
          align === "left" ? "btn-left" : "btn-center"
        )}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {imgSrc && <img className="btn-image" src={imgSrc} alt={children} />}
        <span className="btn-label">{children}</span>
      </a>
    );
  }
  return (
    <button className="btn btn-primary" onClick={onClick}>
      {imgSrc && <img className="btn-image" src={imgSrc} alt={children} />}
      <span>{children}</span>
    </button>
  );
}

export default Button;
