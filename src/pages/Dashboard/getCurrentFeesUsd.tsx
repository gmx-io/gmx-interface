import type { InfoTokens } from "domain/tokens";
import { BN_ZERO, expandDecimals } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

export function getCurrentFeesUsd(tokenAddresses: string[], fees: bigint[], infoTokens: InfoTokens) {
  if (!fees || !infoTokens) {
    return BN_ZERO;
  }

  let currentFeesUsd = BN_ZERO;
  for (let i = 0; i < tokenAddresses.length; i++) {
    const tokenAddress = tokenAddresses[i];
    const tokenInfo = infoTokens[tokenAddress];
    if (!tokenInfo || tokenInfo.contractMinPrice === 0n || tokenInfo.contractMinPrice === undefined) {
      continue;
    }

    const feeUsd = bigMath.mulDiv(fees[i], tokenInfo.contractMinPrice, expandDecimals(1, tokenInfo.decimals));
    currentFeesUsd = currentFeesUsd + feeUsd;
  }

  return currentFeesUsd;
}
