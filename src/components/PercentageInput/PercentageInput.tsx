import "./PercentageInput.scss";
import { useState } from "react";
import cx from "classnames";
import { formatAmount } from "lib/numbers";

const validDecimalRegex = /^\d+(\.\d{0,2})?$/; // 0.00 ~ 99.99

function getValueText(value: number) {
  return formatAmount(value, 2, 2).replace(/0+$/, "");
}

type Props = {
  onChange: (value: number) => void;
  defaultValue: number;
  maxValue?: number;
  highValue?: number;
  suggestions?: number[];
  lowValueWarningText?: string;
  highValueWarningText?: string;
};

export default function PercentageInput({
  onChange,
  defaultValue,
  maxValue = 99 * 100,
  highValue,
  suggestions = [0.3, 0.5, 1, 1.5],
  highValueWarningText,
  lowValueWarningText,
}: Props) {
  const defaultValueText = getValueText(defaultValue);
  const [inputValue, setInputvalue] = useState<string>(defaultValueText);
  const [isPanelVisible, setIsPanelVisible] = useState<boolean>(false);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { value } = event.target;
    if (value === "") {
      setInputvalue(value);
      onChange(defaultValue);
      return;
    }

    const parsedValue = Math.round(Number.parseFloat(value) * 100);
    if (Number.isNaN(parsedValue)) {
      return;
    }

    if (parsedValue >= maxValue) {
      onChange(maxValue);
      setInputvalue(String(maxValue / 100));
      return;
    }

    if (validDecimalRegex.test(value)) {
      onChange(parsedValue);
      setInputvalue(value);
    }
  }

  function getPercentageError() {
    const parsedValue = Math.round(Number.parseFloat(inputValue) * 100);
    if (highValue && parsedValue >= highValue) {
      return highValueWarningText;
    }

    if (lowValueWarningText && parsedValue < defaultValue) {
      return lowValueWarningText;
    }
  }

  return (
    <div className="Percentage-input-wrapper">
      <div className={cx("Percentage-input", { "input-error": !!getPercentageError() })}>
        <input
          id="slippage-input"
          onFocus={() => setIsPanelVisible(true)}
          onBlur={() => setIsPanelVisible(false)}
          value={!!inputValue ? inputValue : ""}
          placeholder={inputValue || defaultValueText}
          onChange={handleChange}
        />
        <label htmlFor="slippage-input">
          <span>%</span>
        </label>
      </div>
      {isPanelVisible && (
        <ul className="Percentage-list">
          {suggestions.map((slippage) => (
            <li
              key={slippage}
              onMouseDown={() => {
                setInputvalue(String(slippage));
                onChange(slippage * 100);
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
