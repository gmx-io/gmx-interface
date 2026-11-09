import { formatAmount } from "lib/numbers";

import { SOLANA_GT_DECIMALS } from "./solanaReferralsTypes";

const ONE_GT = 10n ** BigInt(SOLANA_GT_DECIMALS);

// Same rule as the GT Points page: 2 decimals from 1 GT up, 4 below (small rewards like 0.0003 GT), with separators.
export function formatGt(amount: bigint, { signed = false }: { signed?: boolean } = {}) {
  const abs = amount < 0n ? -amount : amount;
  const decimals = abs !== 0n && abs < ONE_GT ? 4 : 2;
  const sign = amount < 0n ? "−" : signed && amount > 0n ? "+" : "";
  return `${sign}${formatAmount(abs, SOLANA_GT_DECIMALS, decimals, true)} GT`;
}

// Same as the GT Points page: the first and last 6 characters of a Solana address.
export function shortenSolanaAddress(address: string) {
  return address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-6)}` : address;
}
