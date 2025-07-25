import cx from "classnames";
import { HTMLProps, MouseEvent as ReactMouseEvent, ReactNode, RefObject, useMemo } from "react";

import ButtonLink from "./ButtonLink";

import "./Button.scss";

type ButtonVariant = "primary" | "primary-action" | "secondary" | "link" | "ghost";

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
  qa?: string;
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
  qa,
  ...rest
}: ButtonProps) {
  const classNames = cx("button ", variant, className, textAlign, {
    "px-24 py-18 text-16": variant === "primary-action",
    "px-12 py-8 text-[13px] max-md:px-10 max-md:py-6": variant !== "primary-action",
  });
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
        qa={qa}
        {...rest}
      >
        {img}
        {children}
      </ButtonLink>
    );
  }

  if (onClick) {
    return (
      <button
        data-qa={qa}
        ref={buttonRef}
        type={type}
        className={classNames}
        onClick={handleClick}
        disabled={disabled}
        {...rest}
      >
        {img}
        {children}
      </button>
    );
  }

  return (
    <button data-qa={qa} ref={buttonRef} type={type} className={classNames} disabled={disabled} {...rest}>
      {img}
      {children}
    </button>
  );
}
