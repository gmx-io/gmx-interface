import type { GlvAndGmMarketsInfoData } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { TokenData, TokensData, convertToUsd } from "domain/synthetics/tokens";

/**
 * Sorts GM tokens by:
 * 1. User owned wallet balance descending
 * 2. Simply descending on TVL in dollars for the pool
 */
export function sortGmTokensDefault(marketsInfoData: GlvAndGmMarketsInfoData, marketTokensData: TokensData) {
  if (marketsInfoData === undefined || marketTokensData === undefined) {
    return [];
  }

  const tokens: { tokenData: TokenData; totalSupplyUsd: bigint; balanceUsd: bigint }[] = [];

  for (const market of Object.values(marketsInfoData)) {
    if (market.isDisabled) {
      continue;
    }

    const marketTokenData = isGlvInfo(market) ? market.glvToken : marketTokensData[market.marketTokenAddress];

    if (!marketTokenData) {
      continue;
    }

    const totalSupplyUsd = convertToUsd(
      marketTokenData.totalSupply,
      marketTokenData.decimals,
      marketTokenData.prices.minPrice
    );

    const balanceUsd = convertToUsd(marketTokenData.balance, marketTokenData.decimals, marketTokenData.prices.minPrice);

    tokens.push({
      tokenData: marketTokenData,
      totalSupplyUsd: totalSupplyUsd ?? 0n,
      balanceUsd: balanceUsd ?? 0n,
    });
  }

  // Sort by user balance first (descending), then by TVL (descending)
  tokens.sort((a, b) => {
    // Compare balances directly - tokens with higher balance come first
    if (a.balanceUsd !== b.balanceUsd) {
      return a.balanceUsd > b.balanceUsd ? -1 : 1;
    }

    // If balances are equal, sort by total supply descending
    return a.totalSupplyUsd > b.totalSupplyUsd ? -1 : 1;
  });

  return tokens.map((token) => token.tokenData);
}
