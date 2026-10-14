import { USDC_DECIMALS } from "domain/gtBuyback/useGtBuybackSummary";
import { GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import { formatAmount, formatBalanceAmount } from "lib/numbers";

export function formatGt(amount: bigint) {
  return formatBalanceAmount(amount, GT_DECIMALS, "GT", { showZero: true })
    .replace(/(\.\d*?)0+(?=\s?GT$)/, "$1")
    .replace(/\.(?=\s?GT$)/, "");
}

export function formatGtNumber(amount: bigint) {
  return formatAmount(amount, GT_DECIMALS, 2, true, { trimTrailingZeros: true });
}

export function formatUsdc(amount: bigint) {
  return `${formatAmount(amount, USDC_DECIMALS, 2, true)} USDC`;
}
