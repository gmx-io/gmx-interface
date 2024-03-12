import type { TokenData } from "domain/synthetics/tokens/types";
import type { AvailableTokenOptions } from "domain/synthetics/trade";

export function sortTokens(
  sortOptions: Pick<AvailableTokenOptions, "sortedIndexTokensWithPoolValue" | "sortedLongAndShortTokens">,
  tokenDataArr: TokenData[]
) {
  const primarySortSequence = sortOptions.sortedIndexTokensWithPoolValue;
  const secondarySortSequence = sortOptions.sortedLongAndShortTokens;

  const getAddr = (token: TokenData, sequence: string[]) => {
    // making sure to use the wrapped address if it exists in the extended sort sequence
    if (token.wrappedAddress && sequence.includes(token.wrappedAddress)) {
      return token.wrappedAddress;
    }
    return token.address;
  };

  const getIndex = (token: TokenData, sequence: string[]) => {
    const address = getAddr(token, sequence);
    return sequence.indexOf(address);
  };

  const sortedTokens = [...tokenDataArr].sort((a, b) => {
    const aIndex = getIndex(a, primarySortSequence);
    const bIndex = getIndex(b, primarySortSequence);

    const areBothIndexesNotFound = aIndex === -1 && bIndex === -1;

    if (areBothIndexesNotFound) {
      const aSecondarySortIndex = getIndex(a, secondarySortSequence);
      const bSecondarySortIndex = getIndex(b, secondarySortSequence);

      if (aSecondarySortIndex === bSecondarySortIndex) {
        const isAWrapped = Boolean(a.wrappedAddress);
        const isBWrapped = Boolean(b.wrappedAddress);

        // Put wrapped tokens after the unwrapped ones
        if (isAWrapped && !isBWrapped) {
          return 1;
        }
        if (!isAWrapped && isBWrapped) {
          return -1;
        }
      }

      return aSecondarySortIndex - bSecondarySortIndex;
    }

    if (aIndex === -1) {
      return 1;
    }

    if (bIndex === -1) {
      return -1;
    }

    if (aIndex === bIndex) {
      const isAWrapped = Boolean(a.wrappedAddress);
      const isBWrapped = Boolean(b.wrappedAddress);

      // Put wrapped tokens after the unwrapped ones
      if (isAWrapped && !isBWrapped) {
        return 1;
      }
      if (!isAWrapped && isBWrapped) {
        return -1;
      }
    }

    return aIndex - bIndex;
  });

  return sortedTokens;
}
