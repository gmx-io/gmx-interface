import "./SuggestionInput.scss";
import { useState } from "react";
import cx from "classnames";

type Props = {
  value?: string;
  setValue?: () => void;
  placeholder?: string;
  suggestionList?: number[];
  symbol?: string;
};

export default function SuggestionInput({ placeholder, value, setValue, suggestionList, symbol }: Props) {
  const [isPanelVisible, setIsPanelVisible] = useState(false);

  function handleChange() {}

  return (
    <div className="Suggestion-input-wrapper">
      <div className={cx("Suggestion-input", { "input-error": false })}>
        <input
          id="suggestion-input"
          onFocus={() => setIsPanelVisible(true)}
          onBlur={() => setIsPanelVisible(false)}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={handleChange}
        />
        <label htmlFor="suggestion-input">
          <span>{symbol}</span>
        </label>
      </div>
      {suggestionList && isPanelVisible && (
        <ul className="Suggestion-list">
          {suggestionList.map((slippage) => (
            <li
              key={slippage}
              onMouseDown={() => {
                setIsPanelVisible(false);
              }}
            >
              {slippage}%
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
