import cx from "classnames";
import "./Button.css";

export default function Button({ href, imgSrc, children, onClick, className, size = "lg", align = "center", ...rest }) {
  let classNames = cx("btn btn-primary", align === "left" ? "btn-left" : "btn-center", `btn-${size}`, className);
  return (
    <button className={classNames} onClick={onClick} {...rest}>
      {imgSrc && <img className="btn-image" src={imgSrc} alt={children} />}
      <span className="btn-label">{children}</span>
    </button>
  );
}

export function ConnectWalletButton({ imgSrc, children, onClick, className = undefined }) {
  let classNames = cx("btn btn-primary btn-sm connect-wallet", className);
  return (
    <button className={classNames} onClick={onClick}>
      {imgSrc && <img className="btn-image" src={imgSrc} alt={children} />}
      <span className="btn-label">{children}</span>
    </button>
  );
}
