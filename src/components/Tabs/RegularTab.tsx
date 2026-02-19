import cx from "classnames";

import Button from "components/Button/Button";

import { RegularOption } from "./types";

type Props<V extends string | number> = {
  option: RegularOption<V>;
  selectedValue: V | undefined;
  onOptionClick: ((value: V) => void) | undefined;
  regularOptionClassname?: string;
  qa?: string;
  type: "inline" | "block" | "inline-primary" | "pills";
};

export default function RegularTab<V extends string | number>({
  option,
  selectedValue,
  onOptionClick,
  regularOptionClassname,
  qa,
  type,
}: Props<V>) {
  const isActive = option.value === selectedValue;
  const isDisabled = option.disabled;
  const label = option.label || option.value;
  const optionClassName = isActive ? option.className?.active : option.className?.regular;

  if (type === "pills") {
    return (
      <button
        type="button"
        className={cx(
          "text-body-medium rounded-full border px-12 py-6 font-medium transition-colors",
          optionClassName,
          regularOptionClassname,
          {
            "border-slate-600 bg-slate-800 text-typography-primary": isActive,
            "bg-transparent border-slate-600 text-typography-secondary hover:text-typography-primary": !isActive,
          }
        )}
        onClick={() => onOptionClick?.(option.value)}
        key={option.value}
        data-qa={qa ? `${qa}-tab-${option.value}` : undefined}
      >
        {option.icon && <span className="mr-4 inline-flex items-center">{option.icon}</span>}
        {label}
      </button>
    );
  }

  if (type === "inline-primary") {
    return (
      <Button
        type="button"
        variant={isActive ? "primary" : "secondary"}
        onClick={() => !isDisabled && onOptionClick?.(option.value)}
        key={option.value}
        data-qa={qa ? `${qa}-tab-${option.value}` : undefined}
        className={cx(optionClassName, regularOptionClassname, {
          "cursor-not-allowed opacity-50": isDisabled,
        })}
        disabled={isDisabled}
      >
        {option.icon}
        {label}
      </Button>
    );
  }

  if (type === "inline") {
    return (
      <Button
        type="button"
        variant={isActive ? "secondary" : "ghost"}
        onClick={() => !isDisabled && onOptionClick?.(option.value)}
        key={option.value}
        data-qa={qa ? `${qa}-tab-${option.value}` : undefined}
        className={cx(optionClassName, regularOptionClassname, {
          "!text-typography-primary": isActive,
          "cursor-not-allowed opacity-50": isDisabled,
        })}
        disabled={isDisabled}
      >
        {option.icon}
        {label}
      </Button>
    );
  }

  return (
    <button
      type="button"
      className={cx(
        `-mb-[0.5px] flex items-baseline justify-center gap-8 border-b-[2.5px] border-b-[transparent] px-20 pb-9 pt-11
        font-medium first:rounded-tl-8 last:rounded-tr-8 hover:text-typography-primary`,
        optionClassName,
        regularOptionClassname,
        {
          "border-b-blue-300 !text-typography-primary": isActive,
          "text-typography-secondary": !isActive,
          "cursor-not-allowed opacity-50": isDisabled,
        }
      )}
      onClick={() => !isDisabled && onOptionClick?.(option.value)}
      key={option.value}
      data-qa={qa ? `${qa}-tab-${option.value}` : undefined}
      disabled={isDisabled}
    >
      {option.icon}
      {label}
    </button>
  );
}
