import { zeroAddress } from "viem";

import type { TokensData } from "domain/synthetics/tokens";
import { convertToUsd } from "domain/tokens";
import { getByKey } from "lib/objects";
import { getMidPrice } from "sdk/utils/tokens";

export function calculateNetworkFeeDetails({
  gasLimit,
  gasPrice,
  tokensData,
}: {
  gasLimit: bigint | undefined;
  gasPrice: bigint | undefined;
  tokensData: TokensData | undefined;
}): { amount: bigint; usd: bigint; decimals: number; symbol: string } | undefined {
  if (gasLimit === undefined || gasPrice === undefined) {
    return undefined;
  }

  const nativeTokenAmount = gasLimit * gasPrice;
  const nativeTokenData = getByKey(tokensData, zeroAddress);

  if (nativeTokenData === undefined) {
    return undefined;
  }

  const usd: bigint =
    convertToUsd(nativeTokenAmount, nativeTokenData.decimals, getMidPrice(nativeTokenData.prices)) ?? 0n;

  return {
    amount: nativeTokenAmount,
    usd,
    decimals: nativeTokenData.decimals,
    symbol: nativeTokenData.symbol,
  };
}
