import { ReactNode } from "react";
import cx from "classnames";
import "./Button.css";

type Props = {
  href: string;
  imgSrc: string;
  children: ReactNode;
  imgName: string;
  className?: string;
  size?: string;
};

export default function ButtonLink({ href, imgSrc, children, className, imgName, size = "lg" }: Props) {
  let classNames = cx("btn btn-primary btn-left", `btn-${size}`, className);
  return (
    <a className={classNames} href={href} target="_blank" rel="noopener noreferrer">
      {imgSrc && <img className="btn-image" src={imgSrc} alt={imgName} />}
      <span className="btn-label">{children}</span>
    </a>
  );
}
