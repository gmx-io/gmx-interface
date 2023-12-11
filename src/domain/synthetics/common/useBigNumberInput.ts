import { BigNumber } from "ethers";
import { formatAmount } from "lib/numbers";
import { useCallback, useState } from "react";

function numberToString(value: BigNumber, decimals: number, displayDecimals: number) {
  return formatAmount(value, decimals, displayDecimals);
}

function stringToNumber(value: string, decimals: number) {
  value = value.replace(/,/g, "").trim();

  if (value.startsWith("0")) {
    value = value.replace(/^0+/, "");
  }

  if (value.trim() === "") {
    value = "0";
  }

  if (value === ".") {
    value = "0";
  }

  if (value.endsWith(".")) {
    value = value.slice(0, -1);
  }

  const [wholePart, fraction] = value.split(".");
  const fractionLength = fraction?.length || 0;
  const multiplier = BigNumber.from(10).pow(fractionLength);
  try {
    return BigNumber.from(wholePart || 0)
      .mul(multiplier)
      .add(BigNumber.from(fraction || 0))
      .mul(BigNumber.from(10).pow(decimals - fractionLength));
  } catch (e) {
    return null;
  }
}

export function useBigNumberState(initialValue: BigNumber, decimals: number, displayDecimals: number) {
  const [value, setRawValue] = useState(initialValue);
  const [displayValue, setRawDisplayValue] = useState(() => numberToString(initialValue, decimals, displayDecimals));

  const setValue = useCallback(
    (newValue: BigNumber) => {
      setRawValue(newValue);
      setRawDisplayValue(numberToString(newValue, decimals, displayDecimals));
    },
    [decimals, displayDecimals]
  );

  const setDisplayValue = useCallback(
    (newValue: string) => {
      const number = stringToNumber(newValue, decimals);
      if (number === null) return;

      setRawDisplayValue(newValue);
      setRawValue(number);
    },
    [decimals]
  );

  return {
    value,
    setValue,
    displayValue,
    setDisplayValue,
  };
}
