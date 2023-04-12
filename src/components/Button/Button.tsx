import { ReactNode, HTMLProps } from "react";
import cx from "classnames";
import ButtonLink from "./ButtonLink";
import "./Button.scss";

type ButtonVariant = "primary" | "primary-action" | "secondary";

type ButtonProps = HTMLProps<HTMLButtonElement> & {
  children: ReactNode;
  variant: ButtonVariant;
  className?: string;
  textAlign?: "center" | "left" | "right";
  disabled?: boolean;
  onClick?: () => void;
  to?: string;
  type?: "button" | "submit" | "reset";
  imgInfo?: {
    src: string;
    alt?: string;
  };
  newTab?: boolean;
};

export default function Button({
  variant,
  disabled,
  onClick,
  children,
  textAlign = "center",
  to,
  className,
  imgInfo,
  type,
  newTab,
  ...rest
}: ButtonProps) {
  const classNames = cx("button", variant, className, textAlign);
  const showExternalLinkArrow = variant === "secondary";

  function handleClick() {
    if (disabled || !onClick) {
      return;
    }

    if (onClick) {
      onClick();
    }
  }

  if (to) {
    return (
      <ButtonLink
        className={classNames}
        to={to}
        onClick={onClick}
        newTab={newTab}
        showExternalLinkArrow={showExternalLinkArrow}
        disabled={disabled}
        {...rest}
      >
        {imgInfo && <img className="btn-image" src={imgInfo.src} alt={imgInfo.alt || ""} />}
        {children}
      </ButtonLink>
    );
  }

  if (onClick) {
    return (
      <button className={classNames} onClick={handleClick} disabled={disabled} {...rest}>
        {imgInfo && <img className="btn-image" src={imgInfo.src} alt={imgInfo.alt || ""} />}
        {children}
      </button>
    );
  }

  return (
    <button type={type} className={classNames} disabled={disabled} {...rest}>
      {imgInfo && <img className="btn-image" src={imgInfo.src} alt={imgInfo.alt || ""} />}
      {children}
    </button>
  );
}
