import { formatAmount, formatUsd } from "lib/numbers";
import { convertToUsd } from "sdk/utils/tokens";

export function RewardsTokenValue({ amount, decimals, price }: { amount: bigint; decimals: number; price?: bigint }) {
  const amountUsd = convertToUsd(amount, decimals, price);

  return (
    <span className="flex items-center gap-4 whitespace-nowrap">
      <span>{formatAmount(amount, decimals, 4, true, { trimTrailingZeros: true })}</span>
      {amountUsd !== undefined ? (
        <span className="text-typography-secondary">
          ({formatUsd(amountUsd, { fallbackToZero: true, displayDecimals: 2 })})
        </span>
      ) : null}
    </span>
  );
}
