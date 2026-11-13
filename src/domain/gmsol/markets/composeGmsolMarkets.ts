import { ARBITRUM } from "config/chains";
import { GMSOL_MARKETS } from "config/gmsol/markets";
import type { PositionsConstants } from "domain/synthetics/positions/usePositionsConstants";
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

  // Solana mints never match Arbitrum's wrapped token, so the EVM chain id only keeps the helper typed.
  const marketsInfoData = composeFullMarketsInfoData({
    chainId: ARBITRUM,
    marketsAddresses,
    rawMarketsInfoData,
    tokensData,
  });

  return { marketsAddresses, marketsData, marketsInfoData };
}

type GmsolMarketMinimums = { minCollateralUsd?: unknown; minPositionSizeUsd?: unknown };

function maxBigInt(a: bigint | undefined, b: bigint) {
  return a === undefined || b > a ? b : a;
}

// gmsol sets the minimums per market; the shared trade box reads one pair, so the largest applies.
export function getGmsolPositionsConstants(rawMarketsInfoData: RawMarketsInfoData): PositionsConstants | undefined {
  let minCollateralUsd: bigint | undefined;
  let minPositionSizeUsd: bigint | undefined;

  for (const address of getGmsolEnabledMarketAddresses(rawMarketsInfoData)) {
    const raw = rawMarketsInfoData[address] as unknown as GmsolMarketMinimums;

    if (typeof raw.minCollateralUsd !== "bigint" || typeof raw.minPositionSizeUsd !== "bigint") {
      return undefined;
    }

    minCollateralUsd = maxBigInt(minCollateralUsd, raw.minCollateralUsd);
    minPositionSizeUsd = maxBigInt(minPositionSizeUsd, raw.minPositionSizeUsd);
  }

  if (minCollateralUsd === undefined || minPositionSizeUsd === undefined) {
    return undefined;
  }

  return {
    minCollateralUsd,
    minPositionSizeUsd,
    maxAutoCancelOrders: 0n,
    claimableCollateralDelay: 0n,
    claimableCollateralReductionFactor: 0n,
    claimableCollateralTimeDivisor: 0n,
  };
}
