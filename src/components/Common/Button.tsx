import { ReactNode } from "react";
import cx from "classnames";
import "./Button.css";

type Props = {
  imgSrc: string;
  children: ReactNode;
  imgName: string;
  href?: string;
  className?: string;
  size?: string;
  onClick?: () => void;
};

export default function Button({ href, imgSrc, children, className, imgName, onClick, size = "lg" }: Props) {
  let classNames = cx("btn btn-primary btn-left", `btn-${size}`, className);
  if (onClick) {
    return (
      <button className={classNames} onClick={onClick}>
        {imgSrc && <img className="btn-image" src={imgSrc} alt={imgName} />}
        <span className="btn-label">{children}</span>
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
