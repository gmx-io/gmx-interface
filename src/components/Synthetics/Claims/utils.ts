import { RebateInfoItem } from "domain/synthetics/fees/useRebatesInfo";
import { TokensData, getTokenData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { expandDecimals } from "lib/numbers";

export function calcTotalRebateUsd(
  rebates: RebateInfoItem[],
  tokensData: TokensData | undefined,
  ignoreFactor: boolean
) {
  if (!tokensData) {
    return BigInt(0);
  }

  return rebates.reduce((total, rebate) => {
    const token = getTokenData(tokensData, rebate.tokenAddress);

    if (!token) {
      return total;
    }

    const price = token.prices.minPrice;
    const value = ignoreFactor ? rebate.value : rebate.valueByFactor;
    const rebateUsd = value.mul(price).div(expandDecimals(1, token.decimals));

    return total.add(rebateUsd);
  }, BigInt(0));
}
