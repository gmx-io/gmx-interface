import { ReactNode } from "react";
import cx from "classnames";
import "./Button.scss";

export enum ButtonType {
  Transparent,
}

type Props = {
  type: ButtonType;
  children: ReactNode;
  imgSrc?: string;
  imgName?: string;
  className?: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export default function Button({ href, imgSrc, children, className, imgName, onClick, disabled = false, type }: Props) {
  let classNames = cx({ "transparent-btn": type === ButtonType.Transparent }, className);
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
