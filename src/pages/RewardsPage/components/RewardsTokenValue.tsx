import { expandDecimals, formatAmount, formatAmountHuman, formatUsd, USD_DECIMALS } from "lib/numbers";
import { convertToUsd } from "sdk/utils/tokens";

const SHORT_USD_FROM = expandDecimals(1000, USD_DECIMALS);

// $1,000 and up in short form ($24.8K) so the token amount and its value fit in narrow table columns.
function formatValueUsd(amountUsd: bigint) {
  if (amountUsd < SHORT_USD_FROM) return formatUsd(amountUsd, { fallbackToZero: true, displayDecimals: 2 });

  return formatAmountHuman(amountUsd, USD_DECIMALS, true, 1)
    .replace(/\.0(?=[kmb]$)/, "")
    .replace(/[kmb]$/, (suffix) => suffix.toUpperCase());
}

export function RewardsTokenValue({ amount, decimals, price }: { amount: bigint; decimals: number; price?: bigint }) {
  const amountUsd = convertToUsd(amount, decimals, price);

  return (
    <span className="flex items-center gap-4 whitespace-nowrap">
      <span>{formatAmount(amount, decimals, 4, true, { trimTrailingZeros: true })}</span>
      {amountUsd !== undefined ? (
        <span className="text-typography-secondary">({formatValueUsd(amountUsd)})</span>
      ) : null}
    </span>
  );
}
