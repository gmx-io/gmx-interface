import "./SuggestionInput.scss";
import { ChangeEvent, KeyboardEvent, useCallback, useRef, useState } from "react";
import cx from "classnames";
import NumberInput from "components/NumberInput/NumberInput";

type Props = {
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
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPanelVisible, setIsPanelVisible] = useState(false);

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
    <div className={cx("Suggestion-input-wrapper", className)}>
      <div
        className={cx("Suggestion-input flex items-baseline", { "input-error": isError })}
        onClick={() => inputRef.current?.focus()}
      >
        <NumberInput
          inputRef={inputRef}
          className={cx(inputClassName, "min-w-0 text-right outline-none")}
          onFocus={() => setIsPanelVisible(true)}
          onBlur={handleBlur}
          value={value ?? ""}
          placeholder={placeholder}
          onValueChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <label className="text-slate-100">
          <span>{symbol}</span>
        </label>
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
