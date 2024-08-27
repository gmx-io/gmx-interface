import entries from "lodash/entries";
import values from "lodash/values";
import type { Address } from "viem";

import type { AllMarketsInfoData } from "domain/synthetics/markets";
import { TokenData, TokensData, convertToUsd } from "domain/synthetics/tokens";
import { isGlv } from "domain/synthetics/markets/glv";

/**
 * Sorts GM tokens by:
 * 1. Non-zero / zero balance
 * 2. If non-zero balance, by balance descending
 * 3. If zero balance, by total supply USD descending
 */
export function sortGmTokensDefault(marketsInfoData: AllMarketsInfoData, marketTokensData: TokensData) {
  if (marketsInfoData === undefined || marketTokensData === undefined) {
    return [];
  }

  const groupedTokens: {
    [group in Address | "nonZero"]: {
      tokens: { tokenData: TokenData; totalSupplyUsd: bigint }[];
      totalSupplyUsd: bigint;
      isGlv: boolean;
    };
  } = {} as any;

  for (const market of values(marketsInfoData)) {
    if (market.isDisabled) {
      continue;
    }

    const marketTokenData = isGlv(market) ? market.indexToken : marketTokensData[market.marketTokenAddress];

    if (!marketTokenData) {
      continue;
    }

    const totalSupplyUsd = convertToUsd(
      marketTokenData.totalSupply,
      marketTokenData.decimals,
      marketTokenData.prices.minPrice
    )!;

    const isGlvMarket = isGlv(market);

    let groupKey: Address | "nonZero";
    if (marketTokenData.balance !== undefined && marketTokenData.balance !== 0n) {
      groupKey = "nonZero";
    } else if ("isSpotOnly" in market && market.isSpotOnly) {
      groupKey = market.marketTokenAddress as Address;
    } else {
      groupKey = market.indexTokenAddress as Address;
    }

    if (!groupedTokens[groupKey]) {
      groupedTokens[groupKey] = {
        tokens: [],
        totalSupplyUsd: 0n,
        isGlv: isGlvMarket,
      };
    }

    groupedTokens[groupKey].tokens.push({
      tokenData: marketTokenData,
      totalSupplyUsd: totalSupplyUsd,
    });
    groupedTokens[groupKey].totalSupplyUsd += totalSupplyUsd;
  }

  // sort withing each group
  for (const [groupKey, indexTokenGroup] of entries(groupedTokens)) {
    if (groupKey === "nonZero") {
      // by balance usd descending
      indexTokenGroup.tokens.sort((a, b) => {
        const aUsd = convertToUsd(a.tokenData.balance, a.tokenData.decimals, a.tokenData.prices.minPrice)!;
        const bUsd = convertToUsd(b.tokenData.balance, b.tokenData.decimals, b.tokenData.prices.minPrice)!;
        return aUsd > bUsd ? -1 : 1;
      });
      continue;
    }

    // by total supply descending
    indexTokenGroup.tokens.sort((a, b) => {
      return a.totalSupplyUsd > b.totalSupplyUsd ? -1 : 1;
    });
  }

  // sort and unwrap groups
  const sortedTokens = entries(groupedTokens)
    .sort(([aKey, a], [bKey, b]) => {
      // nonZero first
      if (aKey === "nonZero") {
        return -1;
      }
      if (bKey === "nonZero") {
        return 1;
      }

      // Glv second
      if (a.isGlv && !b.isGlv) {
        return -1;
      }
      if (!a.isGlv && b.isGlv) {
        return 1;
      }

      // by total supply descending
      return a.totalSupplyUsd > b.totalSupplyUsd ? -1 : 1;
    })
    .flatMap((groupEntree) => groupEntree[1].tokens)
    .map((token) => token.tokenData);

  return sortedTokens;
}
