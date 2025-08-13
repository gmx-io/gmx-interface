import cx from "classnames";

import Button from "components/Button/Button";

import { RegularOption } from "./types";

type Props<V extends string | number> = {
  option: RegularOption<V>;
  selectedValue: V | undefined;
  onOptionClick: ((value: V) => void) | undefined;
  regularOptionClassname?: string;
  qa?: string;
  type: "inline" | "block";
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

  if (type === "inline") {
    return (
      <Button
        variant={isActive ? "secondary" : "ghost"}
        onClick={() => onOptionClick?.(option.value)}
        key={option.value}
        data-qa={qa ? `${qa}-tab-${option.value}` : undefined}
        className={cx(optionClassName, regularOptionClassname, {
          "!text-white": isActive,
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
        `-mb-[1px] flex items-center justify-center gap-8 border-b-2 border-b-[transparent] px-20 py-10
        font-medium text-slate-100 first:rounded-tl-8 last:rounded-tr-8 hover:text-white`,
        optionClassName,
        regularOptionClassname,
        {
          "text-white": isActive,
          "border-b-2 border-b-blue-300": isActive,
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
