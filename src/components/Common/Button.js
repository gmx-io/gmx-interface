import cx from "classnames";
import "./Button.css";

function Button(
  { href, imgSrc, children, onClick, className, align = "center" },
  ...rest
) {
  if (typeof children === "object") {
    return (
      <a
        className={cx(
          "btn btn-primary",
          align === "left" ? "btn-left" : "btn-center",
          className
        )}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...rest}
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
          align === "left" ? "btn-left" : "btn-center",
          className
        )}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...rest}
      >
        {imgSrc && <img className="btn-image" src={imgSrc} alt={children} />}
        <span className="btn-label">{children}</span>
      </a>
    );
  }
  return (
    <button
      className={cx(
        "btn btn-primary",
        align === "left" ? "btn-left" : "btn-center",
        className
      )}
      onClick={onClick}
      {...rest}
    >
      {imgSrc && <img className="btn-image" src={imgSrc} alt={children} />}
      <span className="btn-label">{children}</span>
    </button>
  );
}

export default Button;
