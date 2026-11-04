import cx from "classnames";
import { HTMLProps, MouseEvent as ReactMouseEvent, ReactNode, RefObject, useMemo } from "react";

import ButtonLink from "./ButtonLink";

import "./Button.scss";

type ButtonVariant = "primary" | "primary-action" | "secondary" | "ghost";

type ButtonProps = Omit<HTMLProps<HTMLButtonElement>, "size"> & {
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

  buttonRef?: RefObject<HTMLButtonElement>;
  size?: "small" | "medium" | "controlled";
  tone?: "default" | "destructive";
  qa?: string;
};

const FOCUS_RING_CLASSNAME =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-strong";

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
  type = "button",
  newTab,
  buttonRef,

  size = "small",
  tone = "default",
  qa,
  ...rest
}: ButtonProps) {
  const classNames = cx("button", FOCUS_RING_CLASSNAME, variant, className, textAlign, {
    "text-body-large px-24 py-16": variant === "primary-action",
    "text-body-small px-12 py-8": variant !== "primary-action",
    "text-body-small min-h-32 gap-4 px-12 py-8": size === "small" && variant !== "primary-action",
    "min-h-40 gap-8": size === "medium" && variant !== "primary-action",
    destructive: tone === "destructive",
  });

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
