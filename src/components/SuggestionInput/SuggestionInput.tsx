import cx from "classnames";
import { ChangeEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";

import NumberInput from "components/NumberInput/NumberInput";

import "./SuggestionInput.scss";

type Props = {
  inputId?: string;
  value?: string;
  setValue?: (value: string) => void;
  placeholder?: string;
  suggestionList?: number[];
  symbol?: string;
  isError?: boolean;
  inputClassName?: string;
  onBlur?: () => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  className?: string;
  label?: React.ReactNode;
  onPanelVisibleChange?: (isPanelVisible: boolean) => void;
};

export default function SuggestionInput({
  placeholder,
  value,
  setValue,
  suggestionList,
  symbol,
  isError,
  inputClassName,
  onBlur,
  onKeyDown,
  className,
  label,
  onPanelVisibleChange,
  inputId,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPanelVisible, setIsPanelVisible] = useState(false);

  useEffect(() => {
    if (onPanelVisibleChange) {
      onPanelVisibleChange(isPanelVisible);
    }
  }, [isPanelVisible, onPanelVisibleChange]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (setValue) {
        setValue(event.target.value);
      }
    },
    [setValue]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: number) => {
      if (setValue) {
        setValue(suggestion.toString());
        setIsPanelVisible(false);
      }
    },
    [setValue]
  );

  const handleBlur = useCallback(() => {
    setIsPanelVisible(false);
    onBlur?.();
  }, [onBlur]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLInputElement;
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        target.blur();
      } else if (e.key === "Escape") {
        target.blur();
      } else {
        onKeyDown?.(e);
      }
    },
    [onKeyDown]
  );

  return (
    <div className="Suggestion-input-wrapper">
      <div
        className={cx("Suggestion-input flex items-baseline", className, { "input-error": isError, "pr-6": !symbol })}
        onClick={() => inputRef.current?.focus()}
      >
        {label ? <span className="pl-7 pr-7 text-slate-100">{label}</span> : null}
        <NumberInput
          inputId={inputId}
          inputRef={inputRef}
          className={cx(inputClassName, "min-w-0 text-right outline-none")}
          onFocus={() => setIsPanelVisible(true)}
          onBlur={handleBlur}
          value={value ?? ""}
          placeholder={placeholder}
          onValueChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        {symbol && (
          <div className="pr-7 text-slate-100">
            <span>{symbol}</span>
          </div>
        )}
      </div>
      {suggestionList && isPanelVisible && (
        <ul className="Suggestion-list">
          {suggestionList.map((suggestion) => (
            <li key={suggestion} onMouseDown={() => handleSuggestionClick(suggestion)}>
              {suggestion}%
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
