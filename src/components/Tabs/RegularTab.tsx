import cx from "classnames";

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

  return (
    <button
      className={cx(
        `flex items-center justify-center gap-8 font-medium
        text-slate-500 first:rounded-tl-8 last:rounded-tr-8 hover:text-white`,
        optionClassName,
        regularOptionClassname,
        {
          "text-white": isActive,
          "rounded-8 px-12 py-8": type === "inline",
          "px-20 py-10": type === "block",
          "bg-cold-blue-900": type === "inline" && isActive,
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
