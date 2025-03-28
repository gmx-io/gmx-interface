import cx from "classnames";

import { RegularOption } from "./types";

type Props<V extends string | number> = {
  option: RegularOption<V>;
  selectedValue: V | undefined;
  onOptionClick: ((value: V) => void) | undefined;
  regularOptionClassname?: string;
  qa?: string;
};

export default function RegularTab<V extends string | number>({
  option,
  selectedValue,
  onOptionClick,
  regularOptionClassname,
  qa,
}: Props<V>) {
  const isActive = option.value === selectedValue;
  const label = option.label || option.value;
  const optionClassName = isActive ? option.className?.active : option.className?.regular;

  return (
    <div
      className={cx("Tab-option flex items-center justify-center gap-8", optionClassName, regularOptionClassname, {
        active: isActive,
      })}
      onClick={() => onOptionClick?.(option.value)}
      key={option.value}
      data-qa={qa ? `${qa}-tab-${option.value}` : undefined}
    >
      {option.icon && <span className="mt-2 scale-75 opacity-70">{option.icon}</span>}
      {label}
    </div>
  );
}
