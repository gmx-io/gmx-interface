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

// Only markets in the static list are offered; the host also serves delisted ones.
export function getGmsolListedMarketAddresses(rawMarketsInfoData: RawMarketsInfoData): string[] {
  return GMSOL_MARKETS.map((market) => market.marketTokenAddress).filter((address) => rawMarketsInfoData[address]);
}

// Hydration drops a listed market whose index or collateral token has no price, and that market's
// positions with it. Callers treat a false result as incomplete data, not as a shorter market list.
export function hasGmsolListedMarketPrices(rawMarketsInfoData: RawMarketsInfoData, tokensData: TokensData): boolean {
  for (const address of getGmsolListedMarketAddresses(rawMarketsInfoData)) {
    const market = rawMarketsInfoData[address];

    if (
      !tokensData[market.indexTokenAddress] ||
      !tokensData[market.longTokenAddress] ||
      !tokensData[market.shortTokenAddress]
    ) {
      return false;
    }
  }

  return true;
}

export function composeGmsolMarkets(rawMarketsInfoData: RawMarketsInfoData, tokensData: TokensData): GmsolMarkets {
  const marketsAddresses = getGmsolListedMarketAddresses(rawMarketsInfoData);
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

  for (const address of getGmsolListedMarketAddresses(rawMarketsInfoData)) {
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
