import cx from "classnames";
import "./Button.css";

export function ButtonWithExternalLink({ href, imgSrc, children, className, size = "lg", align = "center", ...rest }) {
  let classNames = cx("btn btn-primary", align === "left" ? "btn-left" : "btn-center", `btn-${size}`, className);

  return (
    <a className={classNames} href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {imgSrc && <img className="btn-image" src={imgSrc} alt={children} />}
      <span className="btn-label">{children}</span>
    </a>
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
