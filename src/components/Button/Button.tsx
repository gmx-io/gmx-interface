import { ReactNode } from "react";
import cx from "classnames";
import "./Button.scss";

type Props = {
  children: ReactNode;
  imgSrc?: string;
  imgName?: string;
  className?: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export default function Button({ href, imgSrc, children, className, imgName, onClick, disabled = false }: Props) {
  let classNames = cx("btn", className);
  if (onClick) {
    return (
      <button className={classNames} onClick={onClick} disabled={disabled}>
        {imgSrc ? (
          <>
            <img className="btn-image" src={imgSrc} alt={imgName} />
            <span className="btn-label">{children}</span>
          </>
        ) : (
          <>{children}</>
        )}
      </button>
    );
  }
  return (
    <a className={classNames} href={href} target="_blank" rel="noopener noreferrer">
      {imgSrc && <img className="btn-image" src={imgSrc} alt={imgName} />}
      <span className="btn-label">{children}</span>
    </a>
  );
}
