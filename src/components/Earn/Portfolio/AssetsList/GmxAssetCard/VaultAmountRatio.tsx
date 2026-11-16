import { formatAmount } from "lib/numbers";
import { roundUpDivision } from "sdk/utils/numbers/utils";

const VAULT_AMOUNT_DISPLAY_DECIMALS = 4;
const VAULT_AMOUNT_DISPLAY_STEP = 10n ** BigInt(18 - VAULT_AMOUNT_DISPLAY_DECIMALS);

export function formatVaultAmount(amount: bigint | undefined) {
  return amount === undefined ? "—" : formatAmount(amount, 18, VAULT_AMOUNT_DISPLAY_DECIMALS, true);
}

export function formatVaultAmountRoundedUp(amount: bigint) {
  return formatVaultAmount(roundUpDivision(amount, VAULT_AMOUNT_DISPLAY_STEP) * VAULT_AMOUNT_DISPLAY_STEP);
}

export function VaultAmountRatio({ current, total }: { current: bigint | undefined; total: bigint | undefined }) {
  return (
    <span className="whitespace-nowrap numbers">
      {formatVaultAmount(current)} / {formatVaultAmount(total)}
    </span>
  );
}
