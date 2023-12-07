import cx from "classnames";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { roundToTwoDecimals } from "lib/numbers";
import { useEffect, useMemo, useState } from "react";
import "./PercentageInput.scss";

const validDecimalRegex = /^\d+(\.\d{0,2})?$/; // 0.00 ~ 99.99

function getValueText(value: number) {
  return roundToTwoDecimals((value / BASIS_POINTS_DIVISOR) * 100).toString();
}

type Props = {
  onChange: (value: number) => void;
  defaultValue: number;
  maxValue?: number;
  highValue?: number;
  lowValue?: number;
  suggestions?: number[];
  lowValueWarningText?: string;
  highValueWarningText?: string;
};

export default function PercentageInput({
  onChange,
  defaultValue,
  maxValue = 99 * 100,
  highValue,
  lowValue,
  suggestions = [0.3, 0.5, 1, 1.5],
  highValueWarningText,
  lowValueWarningText,
}: Props) {
  const [inputValue, setInputvalue] = useState<string>(() => getValueText(defaultValue));
  const [isPanelVisible, setIsPanelVisible] = useState<boolean>(false);

  useEffect(() => {
    setInputvalue(getValueText(defaultValue));
  }, [defaultValue]);

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
      setInputvalue(getValueText(maxValue));
      return;
    }

    if (validDecimalRegex.test(value)) {
      onChange(parsedValue);
      setInputvalue(value);
    }
  }

  const error = useMemo(() => {
    const parsedValue = Math.round(Number.parseFloat(inputValue) * 100);

    if (highValue && parsedValue >= highValue) {
      return highValueWarningText;
    }

    if (lowValueWarningText && lowValue && parsedValue < lowValue) {
      return lowValueWarningText;
    }
  }, [inputValue, highValue, lowValueWarningText, lowValue, highValueWarningText]);

  return (
    <div className="Percentage-input-wrapper">
      <div className={cx("Percentage-input", { "input-error": Boolean(error) })}>
        <input
          id="slippage-input"
          onFocus={() => setIsPanelVisible(true)}
          onBlur={() => setIsPanelVisible(false)}
          value={!!inputValue ? inputValue : ""}
          placeholder={inputValue || getValueText(defaultValue)}
          autoComplete="off"
          onChange={handleChange}
        />
        <label htmlFor="slippage-input">
          <span>%</span>
        </label>
      </div>
      {error && !isPanelVisible && (
        <div className={cx("Percentage-input-error", "Tooltip-popup", "z-index-1001", "right-bottom", "warning")}>
          {error}
        </div>
      )}
      {isPanelVisible && (
        <ul className="Percentage-list  ">
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
