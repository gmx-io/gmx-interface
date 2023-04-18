import { formatAmount } from "lib/numbers";
import "./SlippageInput.scss";
import { useState } from "react";
import cx from "classnames";

const MAX_SLIPPAGE = 100 * 100;

export default function SlippageInput({ placeholderValue, update }) {
  const placeHolderValue = formatAmount(placeholderValue, 2, 2);

  const [slippageInput, setSlippageInput] = useState<number | string>(placeHolderValue);
  const [slippageError, setSlippageError] = useState("");

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSlippageError("");
    const { value } = event.target;

    if (value === "") {
      setSlippageInput(value);
      return;
    }

    const parsedValue = Math.round(Number.parseFloat(value) * 100);
    if (Number.isNaN(parsedValue)) {
      return;
    }

    if (parsedValue >= MAX_SLIPPAGE) {
      setSlippageError("Slippage must be less than 100%");
      return;
    }

    setSlippageInput(value);
  }

  return (
    <div className={cx("Slippage-input", { "input-error": slippageError })}>
      <input value={!!slippageInput ? slippageInput : ""} placeholder={placeHolderValue} onChange={handleChange} />
      <span>%</span>
    </div>
  );
}
