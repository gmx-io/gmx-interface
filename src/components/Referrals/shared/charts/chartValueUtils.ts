import { USD_DECIMALS } from "config/factors";
import { bigintToNumber, clamp, expandDecimals, formatUsd } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

const USD_TICK_SIGNIFICANT_DIGITS = 3;
const SUB_CENT_USD_SIGNIFICANT_DIGITS = 2;
const MAX_USD_FRACTION_DIGITS = 9;
const ONE_CENT_USD = expandDecimals(1, USD_DECIMALS - 2);

export function usdYAxisTickFormatter(value: number) {
  if (!isFinite(value) || value === 0) return "0";

  const maximumFractionDigits = clamp(
    getFractionDigitsForSignificantDigits(value, USD_TICK_SIGNIFICANT_DIGITS),
    2,
    MAX_USD_FRACTION_DIGITS
  );

  return formatCompactNumber(value, maximumFractionDigits);
}

export function integerYAxisTickFormatter(value: number) {
  if (!isFinite(value) || value === 0) return "0";

  return formatCompactNumber(value, 0);
}

export function formatChartTooltipUsd(usd: bigint) {
  if (usd === 0n || bigMath.abs(usd) >= ONE_CENT_USD) return formatUsd(usd);

  const displayDecimals = clamp(
    getFractionDigitsForSignificantDigits(bigintToNumber(usd, USD_DECIMALS), SUB_CENT_USD_SIGNIFICANT_DIGITS),
    2,
    MAX_USD_FRACTION_DIGITS
  );

  return formatUsd(usd, { displayDecimals });
}

function getFractionDigitsForSignificantDigits(value: number, significantDigits: number) {
  return significantDigits - 1 - Math.floor(Math.log10(Math.abs(value)));
}

function formatCompactNumber(value: number, maximumFractionDigits: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits,
  }).format(value);
}
