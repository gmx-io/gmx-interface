import { HTMLProps, MouseEvent as ReactMouseEvent, ReactNode, RefObject } from "react";
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
  onClick?: (event: ReactMouseEvent) => void;
  to?: string;
  type?: "button" | "submit" | "reset";
  imgInfo?: {
    src: string;
    alt?: string;
  };
  newTab?: boolean;
  showExternalLinkArrow?: boolean;
  buttonRef?: RefObject<HTMLButtonElement>;
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
  buttonRef,
  showExternalLinkArrow: showExternalLinkArrowOverride,
  ...rest
}: ButtonProps) {
  const classNames = cx("button", variant, className, textAlign);
  const showExternalLinkArrow = showExternalLinkArrowOverride ?? variant === "secondary";

  function handleClick(event: ReactMouseEvent) {
    if (disabled || !onClick) {
      return;
    }

    if (onClick) {
      onClick(event);
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
        ref={buttonRef}
        {...rest}
      >
        {imgInfo && <img className="btn-image" src={imgInfo.src} alt={imgInfo.alt || ""} />}
        {children}
      </ButtonLink>
    );
  }

  if (onClick) {
    return (
      <button ref={buttonRef} className={classNames} onClick={handleClick} disabled={disabled} {...rest}>
        {imgInfo && <img className="btn-image" src={imgInfo.src} alt={imgInfo.alt || ""} />}
        {children}
      </button>
    );
  }

  return (
    <button ref={buttonRef} type={type} className={classNames} disabled={disabled} {...rest}>
      {imgInfo && <img className="btn-image" src={imgInfo.src} alt={imgInfo.alt || ""} />}
      {children}
    </button>
  );
}
