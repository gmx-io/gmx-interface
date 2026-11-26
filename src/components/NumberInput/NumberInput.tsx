import cx from "classnames";
import { ChangeEvent, KeyboardEvent, RefObject } from "react";

import { limitDecimals } from "lib/numbers";

const inputRegex = /^(?:0|[1-9]\d*)(?:\.\d*)?$/;

// 15 whole digits is more than the total supply of any token GMX takes (PEPE ≈ 420 trillion)
export const MAX_INPUT_INTEGER_DIGITS = 15;
// the most decimals any token uses; fields with a token pass its own, smaller count as maxDecimals
export const MAX_INPUT_DECIMALS = 18;

/**
 * Keeps a typed amount to 15 digits before the point and 18 after (or the field's maxDecimals when lower).
 * A change that makes the whole part longer than the limit is refused, never cut, so a pasted amount can't
 * turn into a different number. A value that is already longer (set by Max) stays editable while its whole
 * part doesn't grow.
 */
export function limitNumberInputValue(newValue: string, prevValue: string, maxDecimals?: number): string | undefined {
  const integerDigits = newValue.split(".")[0].length;
  const prevIntegerDigits = prevValue.split(".")[0].length;

  if (integerDigits > MAX_INPUT_INTEGER_DIGITS && integerDigits > prevIntegerDigits) {
    return undefined;
  }

  return limitDecimals(newValue, Math.min(maxDecimals ?? MAX_INPUT_DECIMALS, MAX_INPUT_DECIMALS));
}

export function sanitizeNumberInputValue(rawValue: string, stripLeadingZeros = false): string | undefined {
  let newValue = rawValue.replace(/,/g, ".");

  if (newValue === "") {
    return newValue;
  }

  if (newValue.startsWith(".")) {
    newValue = `0${newValue}`;
  }

  if (stripLeadingZeros) {
    newValue = newValue.replace(/^0+(?=\d)/, "");
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
  stripLeadingZeros?: boolean;
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
  stripLeadingZeros = false,
}: Props) {
  function onChange(e: ChangeEvent<HTMLInputElement>) {
    if (!onValueChange) return;

    const sanitizedValue = sanitizeNumberInputValue(e.target.value, stripLeadingZeros);

    if (sanitizedValue === undefined) return;

    const newValue = limitNumberInputValue(sanitizedValue, String(value), maxDecimals);

    if (newValue === undefined) return;

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
