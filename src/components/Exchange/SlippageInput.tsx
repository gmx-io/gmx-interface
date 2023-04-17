import { formatAmount } from "lib/numbers";
import "./SlippageInput.scss";
import { useState } from "react";
import cx from "classnames";

const MAX_SLIPPAGE = 500;

export default function SlippageInput({ placeholderValue, update }) {
  const placeHolderValue = formatAmount(placeholderValue, 2, 2);
  const [slippageInput, setSlippageInput] = useState("");
  const [slippageError, setSlippageError] = useState("");
  function handleChange(value: string) {
    setSlippageInput(value);
    setSlippageError("");
    const parsed = Math.floor(Number.parseFloat(value) * 100);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_SLIPPAGE) {
      if (value !== ".") {
        setSlippageError("Invalid input");
      }
    } else {
      update(parsed);
    }
  }

  return (
    <div className={cx("Slippage-input", { "input-error": slippageError })}>
      <input
        value={slippageInput.length > 0 ? slippageInput : ""}
        placeholder={placeHolderValue}
        onChange={(e) => handleChange(e.target.value)}
      />
      <span>%</span>
    </div>
  );
}
