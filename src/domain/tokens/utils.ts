import type { TokenData } from "domain/synthetics/tokens";
import { PRECISION } from "lib/numbers";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

export * from "sdk/utils/tokens";

export function getSpread(p: { minPrice: bigint; maxPrice: bigint }): bigint {
  const diff = p.maxPrice - p.minPrice;
  return (diff * PRECISION) / ((p.maxPrice + p.minPrice) / 2n);
}

const BLACKLISTED_REGEX = /Wrapped|\(Wormhole\)|\(LayerZero\)/gim;
export function stripBlacklistedWords(name: string): string {
  return name.replace(BLACKLISTED_REGEX, "").trim();
}

export function sortTokenDataByBalance(a: TokenData, b: TokenData): 1 | -1 | 0 {
  const aBalanceUsd =
    a.prices && a.gmxAccountBalance !== undefined
      ? convertToUsd(a.gmxAccountBalance, a.decimals, getMidPrice(a.prices)) ?? 0n
      : 0n;
  const bBalanceUsd =
    b.prices && b.gmxAccountBalance !== undefined
      ? convertToUsd(b.gmxAccountBalance, b.decimals, getMidPrice(b.prices)) ?? 0n
      : 0n;

  if (aBalanceUsd === bBalanceUsd) {
    return 0;
  }

  return bBalanceUsd > aBalanceUsd ? 1 : -1;
}
