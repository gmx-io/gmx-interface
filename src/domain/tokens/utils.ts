import type { TokenData } from "domain/synthetics/tokens";
import { PRECISION } from "lib/numbers";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";
import type { Token } from "sdk/utils/tokens/types";

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

const UNRANKED_TOKEN_SORT_INDEX = Number.MAX_SAFE_INTEGER;

type SortSequenceToken = Pick<Token, "address" | "symbol" | "wrappedAddress">;

export function createTokenSortSequenceComparator<T extends SortSequenceToken>(
  sortSequence: string[] | undefined
): (a: T, b: T) => number {
  if (!sortSequence) {
    return () => 0;
  }

  const indexByAddress = new Map(sortSequence.map((address, index) => [address, index]));

  const getSortIndex = (token: SortSequenceToken) => {
    const wrappedIndex = token.wrappedAddress === undefined ? undefined : indexByAddress.get(token.wrappedAddress);

    return wrappedIndex ?? indexByAddress.get(token.address) ?? UNRANKED_TOKEN_SORT_INDEX;
  };

  return (a, b) => {
    const aIndex = getSortIndex(a);
    const bIndex = getSortIndex(b);

    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }

    return a.symbol.localeCompare(b.symbol);
  };
}
