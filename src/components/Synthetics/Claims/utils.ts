import { RebateInfoItem } from "domain/synthetics/fees/useRebatesInfo";
import { TokensData, getTokenData } from "domain/synthetics/tokens";
import { bigMath } from "lib/bigmath";
import { expandDecimals } from "lib/numbers";

export function calcTotalRebateUsd(
  rebates: RebateInfoItem[],
  tokensData: TokensData | undefined,
  ignoreFactor: boolean
) {
  if (!tokensData) {
    return 0n;
  }

  return rebates.reduce((total, rebate) => {
    const token = getTokenData(tokensData, rebate.tokenAddress);

    if (!token) {
      return total;
    }

    const price = token.prices.minPrice;
    const value = ignoreFactor ? rebate.value : rebate.valueByFactor;
    const rebateUsd = bigMath.mulDiv(value, price, expandDecimals(1, token.decimals));

    return total + rebateUsd;
  }, 0n);
}
