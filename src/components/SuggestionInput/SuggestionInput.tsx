import "./SuggestionInput.scss";
import { ChangeEvent, useRef, useState } from "react";
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
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPanelVisible, setIsPanelVisible] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (setValue) {
      setValue(event.target.value);
    }
  }
  function handleSuggestionClick(suggestion: number) {
    if (setValue) {
      setValue(suggestion.toString());
      setIsPanelVisible(false);
    }
  }
  function handleBlur() {
    setIsPanelVisible(false);
    onBlur?.();
  }

  return (
    <div className="Suggestion-input-wrapper">
      <div className={cx("Suggestion-input", { "input-error": isError })} onClick={() => inputRef.current?.focus()}>
        <NumberInput
          inputRef={inputRef}
          className={cx(inputClassName, "outline-none")}
          onFocus={() => setIsPanelVisible(true)}
          onBlur={handleBlur}
          value={value ?? ""}
          placeholder={placeholder}
          onValueChange={handleChange}
        />
        <label>
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
