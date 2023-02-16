import cx from "classnames";
import { ReactNode } from "react";
import ButtonLink from "./ButtonLink";
import "./Button.scss";

type ButtonVariant = "primary" | "primary-action" | "semi-clear" | "clear";

type ButtonProps = {
  children: ReactNode;
  variant: ButtonVariant;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  to?: string;
  type?: "button" | "submit" | "reset";
  imgInfo?: {
    src: string;
    alt?: string;
  };
};

export function getClassName(variant: ButtonVariant) {
  return cx("button", {
    primary: variant === "primary",
    "primary-action": variant === "primary-action",
    "semi-clear": variant === "semi-clear",
    clear: variant === "clear",
  });
}

export default function Button({
  variant,
  disabled,
  onClick,
  children,
  to,
  className,
  imgInfo,
  type,
  ...rest
}: ButtonProps) {
  const classNames = cx(getClassName(variant), className);
  function handleClick() {
    if (disabled || !onClick) {
      return;
    }
    if (onClick) {
      onClick();
    }
  }

  if (onClick) {
    return (
      <button className={classNames} onClick={handleClick} disabled={disabled} {...rest}>
        {imgInfo && <img className="btn-image" src={imgInfo.src} alt={imgInfo.alt || ""} />}
        {children}
      </button>
    );
  }
  if (to) {
    return (
      <ButtonLink className={classNames} to={to} {...rest}>
        {imgInfo && <img className="btn-image" src={imgInfo.src} alt={imgInfo.alt || ""} />}
        {children}
      </ButtonLink>
    );
  }
  return (
    <button type={type} className={classNames} disabled={disabled} {...rest}>
      {imgInfo && <img className="btn-image" src={imgInfo.src} alt={imgInfo.alt || ""} />}
      {children}
    </button>
  );
}
