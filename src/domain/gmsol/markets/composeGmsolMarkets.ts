import { GMSOL_MARKETS } from "config/gmsol/markets";
import { composeFullMarketsInfoData } from "sdk/utils/markets";
import type { MarketsData, MarketsInfoData, RawMarketsInfoData } from "sdk/utils/markets/types";
import type { TokensData } from "sdk/utils/tokens/types";

export type GmsolMarkets = {
  marketsAddresses: string[];
  marketsData: MarketsData;
  marketsInfoData: MarketsInfoData;
};

// Markets in the static list that this host response returned, disabled ones included.
// A disabled market stays so its positions and orders can still be composed. EVM does the same.
export function getGmsolListedMarketAddresses(rawMarketsInfoData: RawMarketsInfoData): string[] {
  return GMSOL_MARKETS.map((market) => market.marketTokenAddress).filter((address) => rawMarketsInfoData[address]);
}

function getGmsolEnabledMarketAddresses(rawMarketsInfoData: RawMarketsInfoData): string[] {
  return getGmsolListedMarketAddresses(rawMarketsInfoData).filter((address) => !rawMarketsInfoData[address].isDisabled);
}

function hasMarketTokenPrices(rawMarketsInfoData: RawMarketsInfoData, address: string, tokensData: TokensData) {
  const market = rawMarketsInfoData[address];

  return (
    market !== undefined &&
    Boolean(
      tokensData[market.indexTokenAddress] &&
        tokensData[market.longTokenAddress] &&
        tokensData[market.shortTokenAddress]
    )
  );
}

// Disabled markets are not part of this check. A missing price on an enabled market is one market, not the page.
export function hasGmsolListedMarketPrices(rawMarketsInfoData: RawMarketsInfoData, tokensData: TokensData): boolean {
  return getGmsolEnabledMarketAddresses(rawMarketsInfoData).every((address) =>
    hasMarketTokenPrices(rawMarketsInfoData, address, tokensData)
  );
}

export function composeGmsolMarkets(rawMarketsInfoData: RawMarketsInfoData, tokensData: TokensData): GmsolMarkets {
  const marketsAddresses = getGmsolListedMarketAddresses(rawMarketsInfoData).filter((address) =>
    hasMarketTokenPrices(rawMarketsInfoData, address, tokensData)
  );
  const marketsData: MarketsData = {};

  for (const address of marketsAddresses) {
    const raw = rawMarketsInfoData[address];
    marketsData[address] = {
      marketTokenAddress: raw.marketTokenAddress,
      indexTokenAddress: raw.indexTokenAddress,
      longTokenAddress: raw.longTokenAddress,
      shortTokenAddress: raw.shortTokenAddress,
      isSameCollaterals: raw.isSameCollaterals,
      isSpotOnly: raw.isSpotOnly,
      name: raw.name,
      data: raw.data,
    };
  }

  const marketsInfoData = composeFullMarketsInfoData({
    marketsAddresses,
    rawMarketsInfoData,
    tokensData,
  });

  return { marketsAddresses, marketsData, marketsInfoData };
}
