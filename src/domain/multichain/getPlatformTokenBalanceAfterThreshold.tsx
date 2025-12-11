import { USD_DECIMALS } from "config/factors";
import { numberToBigint } from "lib/numbers";

const PLATFORM_TOKEN_BALANCE_THRESHOLD_USD = numberToBigint(0.01, USD_DECIMALS);

export function getPlatformTokenBalanceAfterThreshold(balanceUsd: bigint | undefined): bigint {
  const ensuredBalanceUsd = balanceUsd ?? 0n;

  if (ensuredBalanceUsd < PLATFORM_TOKEN_BALANCE_THRESHOLD_USD) {
    return 0n;
  }

  return ensuredBalanceUsd;
}
