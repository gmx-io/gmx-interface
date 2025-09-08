import { USD_DECIMALS } from "config/factors";

export function shortFormat(value: number): string {
  if (value < 1000) {
    return value.toString();
  }
  if (value < 1000000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  if (value < 1000000000) {
    return `${(value / 1000000).toFixed(0)}M`;
  }
  return `${(value / 1000000000).toFixed(0)}B`;
}

export function shortFormatUsd(value: bigint): string {
  return `$${shortFormat(Number(value) / 10 ** USD_DECIMALS)}`;
}

export function cleanFormatUsd(rawValue: bigint): string {
  const value = Number(rawValue) / 10 ** USD_DECIMALS;
  if (value > 1_000_000) {
    const remainder = value % 1_000_000;

    //insert space after 3 digits
    const valueStr = (value - remainder).toFixed(0);
    const parts = valueStr.split("");
    const result = parts.map((part, index) => {
      if (index % 3 === 0 && index !== 0) {
        return ` ${part}`;
      }
      return part;
    });
    return `$${result.join("")}`;
  }
  return `$${value.toFixed(0)}`;
}

export function percentFormat(value: number) {
  const percent = value * 100;
  let prefix: string;
  if (percent > 9) {
    prefix = "";
  } else if (percent > 0.9) {
    prefix = "0";
  } else {
    prefix = "00";
  }
  return `${prefix}${percent.toFixed(2)}%`;
}
