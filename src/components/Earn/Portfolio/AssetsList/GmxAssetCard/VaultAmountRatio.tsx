import { formatAmount } from "lib/numbers";

export function formatVaultAmount(amount: bigint | undefined) {
  return amount === undefined ? "—" : formatAmount(amount, 18, 4, true);
}

export function VaultAmountRatio({ current, total }: { current: bigint | undefined; total: bigint | undefined }) {
  return (
    <span className="whitespace-nowrap numbers">
      {formatVaultAmount(current)} / {formatVaultAmount(total)}
    </span>
  );
}
