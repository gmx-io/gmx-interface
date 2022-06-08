import cx from "classnames";
import { Link } from "react-router-dom";
import "./Button.css";

function Button({ href, imgSrc, children, onClick, className, size = "lg", align = "center", ...rest }) {
  let classNames = cx("btn btn-primary", align === "left" ? "btn-left" : "btn-center", `btn-${size}`, className);
  if (typeof children === "object") {
    return (
      <a className={classNames} href={href} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }

  if (href) {
    return (
      <a className={classNames} href={href} target="_blank" rel="noopener noreferrer" {...rest}>
        {imgSrc && <img className="btn-image" src={imgSrc} alt={children} />}
        <span className="btn-label">{children}</span>
      </a>
    );
  }
  return (
    <button className={classNames} onClick={onClick} {...rest}>
      {imgSrc && <img className="btn-image" src={imgSrc} alt={children} />}
      <span className="btn-label">{children}</span>
    </button>
  );
}

export function ConnectWalletButton({ imgSrc, children, onClick, className }) {
  let classNames = cx("btn btn-primary btn-sm connect-wallet", className);
  return (
    <button className={classNames} onClick={onClick}>
      {imgSrc && <img className="btn-image" src={imgSrc} alt={children} />}
      <span className="btn-label">{children}</span>
    </button>
  );
}
export function TransparentButton({ to, children, onClick, className, href }) {
  let classNames = cx("btn btn-primary btn-lg", className);
  function renderButton() {
    if (to) {
      return (
        <Link to={to} className={classNames} onClick={onClick}>
          <span className="btn-label-without-icon">{children}</span>
        </Link>
      );
    } else if (href) {
      return (
        <a href={href} className={classNames} target="_blank" rel="noopener noreferrer">
          <span className="btn-label-without-icon">{children}</span>
        </a>
      );
    } else {
      return (
        <button className={classNames} onClick={onClick}>
          <span className="btn-label-without-icon">{children}</span>
        </button>
      );
    }
  }
  return renderButton();
}

export default Button;
