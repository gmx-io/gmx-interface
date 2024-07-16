import { HTMLProps, MouseEvent as ReactMouseEvent, ReactNode, RefObject, useMemo } from "react";
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
  imgSrc?: string;
  imgAlt?: string;
  imgClassName?: string;
  newTab?: boolean;
  showExternalLinkArrow?: boolean;
  buttonRef?: RefObject<HTMLButtonElement>;
  slim?: boolean;
};

export default function Button({
  variant,
  disabled,
  onClick,
  children,
  textAlign = "center",
  to,
  className,
  imgSrc,
  imgAlt = "",
  imgClassName = "",
  type,
  newTab,
  buttonRef,
  showExternalLinkArrow: showExternalLinkArrowOverride,
  slim,
  ...rest
}: ButtonProps) {
  const classNames = cx("button", variant, className, textAlign, { slim });
  const showExternalLinkArrow = showExternalLinkArrowOverride ?? variant === "secondary";

  const img = useMemo(() => {
    if (!imgSrc) {
      return null;
    }

    return <img className={cx("btn-image", imgClassName)} src={imgSrc} alt={imgAlt} />;
  }, [imgSrc, imgAlt, imgClassName]);

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
        {img}
        {children}
      </ButtonLink>
    );
  }

  if (onClick) {
    return (
      <button ref={buttonRef} className={classNames} onClick={handleClick} disabled={disabled} {...rest}>
        {img}
        {children}
      </button>
    );
  }

  return (
    <button ref={buttonRef} type={type} className={classNames} disabled={disabled} {...rest}>
      {img}
      {children}
    </button>
  );
}
