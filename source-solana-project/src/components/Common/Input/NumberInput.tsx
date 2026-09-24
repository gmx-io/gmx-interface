import { ChangeEvent, KeyboardEvent, RefObject } from 'react';

function escapeSpecialRegExpChars(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const inputRegex = RegExp(`^\\d*(?:\\\\[.])?\\d*$`);

type Props = {
  value?: string | number;
  inputRef?: RefObject<HTMLInputElement>;
  onValueChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  onBlur?: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  className?: string;
  placeholder?: string;
  qa?: string;
  disabled?: boolean;
  decimalPlaces?: number;
};

export function NumberInput({
  value = '',
  inputRef,
  onValueChange,
  onFocus,
  onBlur,
  onKeyDown,
  className,
  placeholder,
  qa,
  disabled = false,
  decimalPlaces,
}: Props) {
  function onChange(e: ChangeEvent<HTMLInputElement>) {
    if (!onValueChange) return;
    // Replace comma with dot
    let newValue = e.target.value.replace(/,/g, '.');
    if (newValue === '.') {
      newValue = '0.';
    }

    if (
      newValue === '' ||
      inputRegex.test(escapeSpecialRegExpChars(newValue))
    ) {
      if (
        decimalPlaces !== undefined &&
        newValue.includes('.') &&
        (newValue.split('.')[1]?.length ?? 0) > decimalPlaces
      ) {
        return;
      }
      e.target.value = newValue;
      onValueChange(e);
    }
  }
  return (
    <input
      data-qa={qa}
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
      onKeyDown={onKeyDown}
      disabled={disabled}
    />
  );
}
