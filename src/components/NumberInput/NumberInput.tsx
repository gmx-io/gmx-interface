import { ChangeEvent, RefObject } from "react";

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
  className?: string;
  placeholder?: string;
};

function NumberInput({ value = "", inputRef, onValueChange, onFocus, onBlur, className, placeholder }: Props) {
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
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      className={className}
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
    />
  );
}

export default NumberInput;
