import { BigNumber } from "ethers";
import { formatAmount } from "lib/numbers";
import { useCallback, useState } from "react";

function numberToString(value: BigNumber, decimals: number, displayDecimals: number) {
  return formatAmount(value, decimals, displayDecimals);
}

function stringToNumber(value: string, decimals: number, displayDecimals: number) {
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

  const split = value.split(".");
  const [int] = split;
  let [, fraction] = split;
  fraction = (fraction ?? "").slice(0, displayDecimals);

  const fractionLength = fraction.length;
  const multiplier = BigNumber.from(10).pow(fractionLength);
  try {
    return BigNumber.from(int || 0)
      .mul(multiplier)
      .add(BigNumber.from(fraction || 0))
      .mul(BigNumber.from(10).pow(decimals - fractionLength));
  } catch (e) {
    return null;
  }
}

export function useBigNumberState(
  initialValue: BigNumber,
  decimals: number,
  displayDecimals: number,
  shouldCutDecimals = false
) {
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
      const number = stringToNumber(newValue, decimals, displayDecimals);
      if (number === null) return;

      setRawDisplayValue(shouldCutDecimals ? cutDecimals(newValue, displayDecimals) : newValue);
      setRawValue(number);
    },
    [decimals, displayDecimals, shouldCutDecimals]
  );

  return {
    value,
    setValue,
    displayValue,
    setDisplayValue,
    isEmpty: !displayValue.trim(),
  };
}

function cutDecimals(value: string, displayDecimals: number) {
  if (!value.includes(".")) return value;
  if (value.endsWith(".")) return value;

  const split = value.split(".");
  const [int] = split;
  let [, fraction] = split;
  fraction = (fraction ?? "").slice(0, displayDecimals);
  return fraction ? `${int}.${fraction}` : int;
}
