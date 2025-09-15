import cx from "classnames";
import { ChangeEvent, KeyboardEvent, RefObject } from "react";

function escapeSpecialRegExpChars(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const inputRegex = RegExp(`^\\d*(?:\\\\[.])?\\d*$`);

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
}: Props) {
  function onChange(e: ChangeEvent<HTMLInputElement>) {
    if (!onValueChange) return;
    // Replace comma with dot
    let newValue = e.target.value.replace(/,/g, ".");
    if (newValue === ".") {
      newValue = "0.";
    }

    if (newValue === "" || inputRegex.test(escapeSpecialRegExpChars(newValue))) {
      e.target.value = newValue;
      onValueChange(e);
    }
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
      maxLength={15}
      spellCheck="false"
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      disabled={isDisabled}
    />
  );
}

export default NumberInput;
