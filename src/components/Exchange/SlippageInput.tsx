import "./SlippageInput.scss";
import { useState } from "react";
import cx from "classnames";
import { formatAmount } from "lib/numbers";

const MAX_SLIPPAGE = 99 * 100;
const HIGH_SLIPPAGE = 2 * 100;
const SLIPPAGE_LISTS = [0.3, 0.5, 1, 1.5];

function getSlippageText(value: number) {
  return formatAmount(value, 2, 2);
}

export default function SlippageInput({ setAllowedSlippage, defaultSlippage }) {
  const [slippageText, setSlippageText] = useState(getSlippageText(defaultSlippage));
  const [slippageError, setSlippageError] = useState("");
  const [isPanelVisible, setIsPanelVisible] = useState(false);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSlippageError("");
    const { value } = event.target;
    if (value === "") {
      setSlippageText(value);
      setAllowedSlippage(defaultSlippage);
      return;
    }

    const parsedValue = Math.round(Number.parseFloat(value) * 100);
    if (Number.isNaN(parsedValue)) {
      return;
    }

    if (parsedValue >= HIGH_SLIPPAGE) {
      setSlippageError("Slippage is too high");
    }

    if (parsedValue >= MAX_SLIPPAGE) {
      setSlippageError("Max slippage can be 100%");
      setAllowedSlippage(MAX_SLIPPAGE);
      setSlippageText(String(MAX_SLIPPAGE / 100));
      return;
    }

    setAllowedSlippage(parsedValue);
    setSlippageText(value);
  }

  return (
    <div className="Slippage-input-wrapper">
      <div className={cx("Slippage-input", { "input-error": slippageError })}>
        <input
          onFocus={() => setIsPanelVisible(true)}
          onBlur={() => setTimeout(() => setIsPanelVisible(false), 100)}
          value={!!slippageText ? slippageText : ""}
          placeholder={String(slippageText)}
          onChange={handleChange}
        />
        <span>%</span>
      </div>
      {isPanelVisible && (
        <ul className="Slippage-list">
          {SLIPPAGE_LISTS.map((slippage) => (
            <li
              key={slippage}
              onClick={() => {
                setSlippageText(String(slippage));
                setAllowedSlippage(slippage * 100);
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
