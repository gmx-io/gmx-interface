import cx from "classnames";
import { ChangeEvent, KeyboardEvent, RefObject } from "react";

import { limitDecimals } from "lib/numbers";

const inputRegex = /^(?:0|[1-9]\d*)(?:\.\d*)?$/;

export function sanitizeNumberInputValue(rawValue: string): string | undefined {
  let newValue = rawValue.replace(/,/g, ".");

  if (newValue === "") {
    return newValue;
  }

  if (newValue.startsWith(".")) {
    newValue = `0${newValue}`;
  }

  if (!inputRegex.test(newValue)) {
    return undefined;
  }

  return newValue;
}

type Props = {
  value?: string | number;
  inputRef?: RefObject<HTMLInputElement>;
  onValueChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
  qa?: string;
  isDisabled?: boolean;
  inputId?: string;
  maxDecimals?: number;
};

function NumberInput({
  value = "",
  inputRef,
  onValueChange,
  onFocus,
  onBlur,
  onKeyDown,
  className,
  placeholder,
  qa,
  inputId,
  isDisabled = false,
  maxDecimals,
}: Props) {
  function onChange(e: ChangeEvent<HTMLInputElement>) {
    if (!onValueChange) return;

    let newValue = sanitizeNumberInputValue(e.target.value);

    if (newValue === undefined) return;

    if (maxDecimals !== undefined) {
      newValue = limitDecimals(newValue, maxDecimals);
    }

    e.target.value = newValue;
    onValueChange(e);
  }
  return (
    <input
      id={inputId}
      data-qa={qa}
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      className={cx(className, "text-typography-primary placeholder:text-typography-secondary")}
      value={value}
      ref={inputRef}
      onChange={onChange}
      autoComplete="off"
      autoCorrect="off"
      minLength={1}
      spellCheck="false"
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      disabled={isDisabled}
    />
  );
}

export default NumberInput;
