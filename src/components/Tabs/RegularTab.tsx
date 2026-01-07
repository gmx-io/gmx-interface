import cx from "classnames";

import Button from "components/Button/Button";

import { RegularOption } from "./types";

type Props<V extends string | number> = {
  option: RegularOption<V>;
  selectedValue: V | undefined;
  onOptionClick: ((value: V) => void) | undefined;
  regularOptionClassname?: string;
  qa?: string;
  type: "inline" | "block" | "inline-primary";
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
  const label = option.label || option.value;
  const optionClassName = isActive ? option.className?.active : option.className?.regular;

  if (type === "inline-primary") {
    return (
      <Button
        variant={isActive ? "primary" : "secondary"}
        onClick={() => onOptionClick?.(option.value)}
        key={option.value}
        data-qa={qa ? `${qa}-tab-${option.value}` : undefined}
        className={cx(optionClassName, regularOptionClassname)}
      >
        {option.icon && <span className="mt-2 scale-75 opacity-70">{option.icon}</span>}
        {label}
      </Button>
    );
  }

  if (type === "inline") {
    return (
      <Button
        variant={isActive ? "secondary" : "ghost"}
        onClick={() => onOptionClick?.(option.value)}
        key={option.value}
        data-qa={qa ? `${qa}-tab-${option.value}` : undefined}
        className={cx(optionClassName, regularOptionClassname, {
          "!text-typography-primary": isActive,
        })}
      >
        {option.icon && <span className="mt-2 scale-75 opacity-70">{option.icon}</span>}
        {label}
      </Button>
    );
  }

  return (
    <button
      className={cx(
        `-mb-[0.5px] flex items-baseline justify-center gap-8 border-b-[2.5px] border-b-[transparent] px-20 pb-9 pt-11
        font-medium first:rounded-tl-8 last:rounded-tr-8 hover:text-typography-primary`,
        optionClassName,
        regularOptionClassname,
        {
          "border-b-blue-300 text-typography-primary": isActive,
          "text-typography-secondary": !isActive,
        }
      )}
      onClick={() => onOptionClick?.(option.value)}
      key={option.value}
      data-qa={qa ? `${qa}-tab-${option.value}` : undefined}
    >
      {option.icon && <span className="mt-2 scale-75 opacity-70">{option.icon}</span>}
      {label}
    </button>
  );
}
