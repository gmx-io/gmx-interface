import { zeroAddress } from "viem";

import type { ContractsChainId } from "configs/chains";
import { BASIS_POINTS_DIVISOR, BASIS_POINTS_DIVISOR_BIGINT } from "configs/factors";
import type { MarketConfig as ConfigMarketConfig } from "configs/markets";
import { convertTokenAddress, getTokenVisualMultiplier, NATIVE_TOKEN_ADDRESS } from "configs/tokens";

import type {
  ClaimableFundingData,
  ContractMarketPrices,
  LeverageTier,
  Market,
  MarketConfig,
  MarketInfo,
  MarketsData,
  MarketsInfoData,
  MarketTicker,
  MarketValues,
  MarketWithTiers,
  RawMarketInfo,
  RawMarketsInfoData,
} from "./types";
import type { DayPriceCandle } from "../24h/types";
import { getBorrowingFactorPerPeriod, getFundingFactorPerPeriod } from "../fees";
import { applyFactor, PRECISION } from "../numbers";
import { getByKey } from "../objects";
import { periodToSeconds } from "../time";
import { convertToContractTokenPrices, convertToUsd, getMidPrice } from "../tokens";
import type { Token, TokenPrices, TokensData } from "../tokens/types";

export function getMarketFullName(p: { longToken: Token; shortToken: Token; indexToken: Token; isSpotOnly: boolean }) {
  const { indexToken, longToken, shortToken, isSpotOnly } = p;

  return `${getMarketIndexName({ indexToken, isSpotOnly })} [${getMarketPoolName({ longToken, shortToken })}]`;
}

export function getMarketIndexName(p: ({ indexToken: Token } | { glvToken: Token }) & { isSpotOnly: boolean }) {
  if (p.isSpotOnly) {
    return `SWAP-ONLY`;
  }

  return `${getMarketBaseName(p)}/USD`;
}

export function getMarketBaseName(p: ({ indexToken: Token } | { glvToken: Token }) & { isSpotOnly: boolean }) {
  const { isSpotOnly } = p;

  const firstToken = "indexToken" in p ? p.indexToken : p.glvToken;

  if (isSpotOnly) {
    return `SWAP-ONLY`;
  }

  const prefix = getTokenVisualMultiplier(firstToken);

  return `${prefix}${firstToken.baseSymbol || firstToken.symbol}`;
}

export function getMarketPoolName(p: { longToken: Token; shortToken: Token }, separator = "-") {
  const { longToken, shortToken } = p;

  return `${longToken.symbol}${separator}${shortToken.symbol}`;
}

export function getContractMarketPrices(tokensData: TokensData, market: Market): ContractMarketPrices | undefined {
  const indexToken = getByKey(tokensData, market.indexTokenAddress);
  const longToken = getByKey(tokensData, market.longTokenAddress);
  const shortToken = getByKey(tokensData, market.shortTokenAddress);

  if (!indexToken || !longToken || !shortToken) {
    return undefined;
  }

  return {
    indexTokenPrice: indexToken && convertToContractTokenPrices(indexToken.prices, indexToken.decimals),
    longTokenPrice: longToken && convertToContractTokenPrices(longToken.prices, longToken.decimals),
    shortTokenPrice: shortToken && convertToContractTokenPrices(shortToken.prices, shortToken.decimals),
  };
}

/**
 * Apart from usual cases, returns `long` for single token backed markets.
 */
export function getTokenPoolType(
  marketInfo: {
    longToken: Token;
    shortToken: Token;
  },
  tokenAddress: string
): "long" | "short" | undefined {
  const { longToken, shortToken } = marketInfo;

  if (longToken.address === shortToken.address && tokenAddress === longToken.address) {
    return "long";
  }

  if (tokenAddress === longToken.address || (tokenAddress === NATIVE_TOKEN_ADDRESS && longToken.isWrapped)) {
    return "long";
  }

  if (tokenAddress === shortToken.address || (tokenAddress === NATIVE_TOKEN_ADDRESS && shortToken.isWrapped)) {
    return "short";
  }

  return undefined;
}

export function getPoolUsdWithoutPnl(
  marketInfo: MarketInfo,
  isLong: boolean,
  priceType: "minPrice" | "maxPrice" | "midPrice"
) {
  const poolAmount = isLong ? marketInfo.longPoolAmount : marketInfo.shortPoolAmount;
  const token = isLong ? marketInfo.longToken : marketInfo.shortToken;

  let price: bigint | undefined;

  if (priceType === "minPrice") {
    price = token.prices?.minPrice;
  } else if (priceType === "maxPrice") {
    price = token.prices?.maxPrice;
  } else {
    price = getMidPrice(token.prices);
  }

  return convertToUsd(poolAmount, token.decimals, price)!;
}

export function getCappedPoolPnl(p: { marketInfo: MarketInfo; poolUsd: bigint; poolPnl: bigint; isLong: boolean }) {
  const { marketInfo, poolUsd, poolPnl, isLong } = p;

  if (poolPnl < 0) {
    return poolPnl;
  }

  const maxPnlFactor: bigint = isLong ? marketInfo.maxPnlFactorForTradersLong : marketInfo.maxPnlFactorForTradersShort;
  const maxPnl = applyFactor(poolUsd, maxPnlFactor);

  return poolPnl > maxPnl ? maxPnl : poolPnl;
}

export function getMaxLeverageByMinCollateralFactor(minCollateralFactor: bigint | undefined) {
  if (minCollateralFactor === undefined) return 100 * BASIS_POINTS_DIVISOR;
  if (minCollateralFactor === 0n) return 100 * BASIS_POINTS_DIVISOR;

  const x = Number(PRECISION / minCollateralFactor);
  const rounded = Math.round(x / 10) * 10;
  return rounded * BASIS_POINTS_DIVISOR;
}

export function getMaxAllowedLeverageByMinCollateralFactor(minCollateralFactor: bigint | undefined) {
  return getMaxLeverageByMinCollateralFactor(minCollateralFactor) / 2;
}

export function getOppositeCollateral(marketInfo: MarketInfo, tokenAddress: string) {
  const poolType = getTokenPoolType(marketInfo, tokenAddress);

  if (poolType === "long") {
    return marketInfo.shortToken;
  }

  if (poolType === "short") {
    return marketInfo.longToken;
  }

  return undefined;
}

export function getOppositeCollateralFromConfig(marketConfig: ConfigMarketConfig, tokenAddress: string) {
  return marketConfig.shortTokenAddress === tokenAddress
    ? marketConfig.longTokenAddress
    : marketConfig.shortTokenAddress;
}

export function getAvailableUsdLiquidityForCollateral(marketInfo: MarketInfo, isLong: boolean) {
  const poolUsd = getPoolUsdWithoutPnl(marketInfo, isLong, "minPrice");

  if (marketInfo.isSpotOnly) {
    return poolUsd;
  }

  const reservedUsd = getReservedUsd(marketInfo, isLong);
  const maxReserveFactor = isLong ? marketInfo.reserveFactorLong : marketInfo.reserveFactorShort;

  if (maxReserveFactor === 0n) {
    return 0n;
  }

  const minPoolUsd = (reservedUsd * PRECISION) / maxReserveFactor;

  const liquidity = poolUsd - minPoolUsd;

  return liquidity;
}

export function getReservedUsd(marketInfo: MarketInfo, isLong: boolean) {
  const { indexToken } = marketInfo;

  if (isLong) {
    return convertToUsd(marketInfo.longInterestInTokens, marketInfo.indexToken.decimals, indexToken.prices.maxPrice)!;
  } else {
    return marketInfo.shortInterestUsd;
  }
}

export function getMarketDivisor({
  longTokenAddress,
  shortTokenAddress,
}: {
  longTokenAddress: string;
  shortTokenAddress: string;
}) {
  return longTokenAddress === shortTokenAddress ? 2n : 1n;
}

export function getOiUsdFromRawValues(
  rawValues: {
    longInterestUsingLongToken: bigint;
    longInterestUsingShortToken: bigint;
    shortInterestUsingLongToken: bigint;
    shortInterestUsingShortToken: bigint;
  },
  marketDivisor: bigint
): { longInterestUsd: bigint; shortInterestUsd: bigint } {
  const longInterestUsingLongToken = rawValues.longInterestUsingLongToken / marketDivisor;
  const longInterestUsingShortToken = rawValues.longInterestUsingShortToken / marketDivisor;
  const shortInterestUsingLongToken = rawValues.shortInterestUsingLongToken / marketDivisor;
  const shortInterestUsingShortToken = rawValues.shortInterestUsingShortToken / marketDivisor;

  const longInterestUsd = longInterestUsingLongToken + longInterestUsingShortToken;
  const shortInterestUsd = shortInterestUsingLongToken + shortInterestUsingShortToken;

  return { longInterestUsd, shortInterestUsd };
}

export function getOiInTokensFromRawValues(
  rawValues: {
    longInterestInTokensUsingLongToken: bigint;
    longInterestInTokensUsingShortToken: bigint;
    shortInterestInTokensUsingLongToken: bigint;
    shortInterestInTokensUsingShortToken: bigint;
  },
  marketDivisor: bigint
): { longInterestInTokens: bigint; shortInterestInTokens: bigint } {
  const longInterestInTokensUsingLongToken = rawValues.longInterestInTokensUsingLongToken / marketDivisor;
  const longInterestInTokensUsingShortToken = rawValues.longInterestInTokensUsingShortToken / marketDivisor;
  const shortInterestInTokensUsingLongToken = rawValues.shortInterestInTokensUsingLongToken / marketDivisor;
  const shortInterestInTokensUsingShortToken = rawValues.shortInterestInTokensUsingShortToken / marketDivisor;

  const longInterestInTokens = longInterestInTokensUsingLongToken + longInterestInTokensUsingShortToken;
  const shortInterestInTokens = shortInterestInTokensUsingLongToken + shortInterestInTokensUsingShortToken;

  return { longInterestInTokens, shortInterestInTokens };
}

export function getMarketPnl(marketInfo: MarketInfo, isLong: boolean, forMaxPoolValue: boolean) {
  const maximize = !forMaxPoolValue;
  const openInterestUsd = getOpenInterestUsd(marketInfo, isLong);
  const openInterestInTokens = getOpenInterestInTokens(marketInfo, isLong);

  if (openInterestUsd === 0n || openInterestInTokens === 0n) {
    return 0n;
  }

  const price = getPriceForPnl(marketInfo.indexToken.prices, isLong, maximize);

  const openInterestValue = convertToUsd(openInterestInTokens, marketInfo.indexToken.decimals, price)!;
  const pnl = isLong ? openInterestValue - openInterestUsd : openInterestUsd - openInterestValue;

  return pnl;
}

export function getOpenInterestUsd(marketInfo: MarketInfo, isLong: boolean) {
  return isLong ? marketInfo.longInterestUsd : marketInfo.shortInterestUsd;
}

export function getOpenInterestInTokens(marketInfo: MarketInfo, isLong: boolean) {
  return isLong ? marketInfo.longInterestInTokens : marketInfo.shortInterestInTokens;
}

export function getOpenInterestForBalance(marketInfo: MarketInfo, isLong: boolean): bigint {
  if (marketInfo.useOpenInterestInTokensForBalance) {
    const interestInTokens = isLong ? marketInfo.longInterestInTokens : marketInfo.shortInterestInTokens;
    const indexTokenPrice = getMidPrice(marketInfo.indexToken.prices);

    return convertToUsd(interestInTokens, marketInfo.indexToken.decimals, indexTokenPrice)!;
  }

  return isLong ? marketInfo.longInterestUsd : marketInfo.shortInterestUsd;
}

export function getPriceForPnl(prices: TokenPrices, isLong: boolean, maximize: boolean) {
  // for long positions, pick the larger price to maximize pnl
  // for short positions, pick the smaller price to maximize pnl
  if (isLong) {
    return maximize ? prices.maxPrice : prices.minPrice;
  }

  return maximize ? prices.minPrice : prices.maxPrice;
}

export function getIsMarketAvailableForExpressSwaps(marketInfo: MarketInfo) {
  return [marketInfo.indexToken, marketInfo.longToken, marketInfo.shortToken].every(
    (token) => token.hasPriceFeedProvider
  );
}

export function getMarket24Stats(dayPriceCandle: DayPriceCandle) {
  const open24h = dayPriceCandle.open;
  const high24h = dayPriceCandle.high;
  const low24h = dayPriceCandle.low;
  const close24h = dayPriceCandle.close;
  const priceChange24h = close24h - open24h;
  const priceChangePercent24hBps = open24h !== 0n ? (priceChange24h * BASIS_POINTS_DIVISOR_BIGINT) / open24h : 0n;

  return {
    open24h,
    high24h,
    low24h,
    close24h,
    priceChange24h,
    priceChangePercent24hBps,
  };
}

export function getMarketTicker(marketInfo: MarketInfo, dayPriceCandle: DayPriceCandle): MarketTicker {
  const markPrice = getMidPrice(marketInfo.indexToken.prices);

  const SECONDS_PER_HOUR = BigInt(periodToSeconds(1, "1h"));
  const fundingRateLong = getFundingFactorPerPeriod(marketInfo, true, SECONDS_PER_HOUR);
  const fundingRateShort = getFundingFactorPerPeriod(marketInfo, false, SECONDS_PER_HOUR);
  const borrowingRateLong = getBorrowingFactorPerPeriod(marketInfo, true, SECONDS_PER_HOUR);
  const borrowingRateShort = getBorrowingFactorPerPeriod(marketInfo, false, SECONDS_PER_HOUR);

  const netRateLong = fundingRateLong + borrowingRateLong;
  const netRateShort = fundingRateShort + borrowingRateShort;

  const openInterestLong = getOpenInterestUsd(marketInfo, true);
  const openInterestShort = getOpenInterestUsd(marketInfo, false);

  const availableLiquidityLong = getAvailableUsdLiquidityForCollateral(marketInfo, true);
  const availableLiquidityShort = getAvailableUsdLiquidityForCollateral(marketInfo, false);

  const poolAmountLongUsd = getPoolUsdWithoutPnl(marketInfo, true, "midPrice");
  const poolAmountShortUsd = getPoolUsdWithoutPnl(marketInfo, false, "midPrice");

  const { high24h, low24h, open24h, close24h, priceChange24h, priceChangePercent24hBps } =
    getMarket24Stats(dayPriceCandle);

  return {
    symbol: marketInfo.name,
    marketTokenAddress: marketInfo.marketTokenAddress,
    markPrice,
    high24h,
    low24h,
    open24h,
    close24h,
    priceChange24h,
    priceChangePercent24hBps,
    openInterestLong,
    openInterestShort,
    availableLiquidityLong,
    availableLiquidityShort,
    poolAmountLongUsd,
    poolAmountShortUsd,
    fundingRateLong,
    fundingRateShort,
    borrowingRateLong,
    borrowingRateShort,
    netRateLong,
    netRateShort,
  };
}

export function composeRawMarketInfo({
  market,
  marketValues,
  marketConfig,
  marketsConstants,
}: {
  market: Market;
  marketValues: MarketValues;
  marketConfig: MarketConfig;
  marketsConstants: { useOpenInterestInTokensForBalance: boolean };
}): RawMarketInfo {
  return {
    ...marketValues,
    ...marketConfig,
    ...market,
    ...marketsConstants,
  };
}

export function composeRawMarketsInfoData({
  marketsAddresses,
  marketsData,
  marketsValuesData,
  marketsConfigsData,
  marketsConstants,
}: {
  marketsAddresses: string[];
  marketsData: MarketsData;
  marketsValuesData: Record<string, MarketValues>;
  marketsConfigsData: Record<string, MarketConfig>;
  marketsConstants: { useOpenInterestInTokensForBalance: boolean };
}): RawMarketsInfoData {
  const data: RawMarketsInfoData = {};

  for (const marketAddress of marketsAddresses) {
    const market = getByKey(marketsData, marketAddress);
    const marketValues = getByKey(marketsValuesData, marketAddress);
    const marketConfig = getByKey(marketsConfigsData, marketAddress);

    if (!market || !marketValues || !marketConfig) {
      continue;
    }

    data[marketAddress] = composeRawMarketInfo({
      market,
      marketValues,
      marketConfig,
      marketsConstants,
    });
  }

  return data;
}

export function hydrateMarketInfo({
  chainId,
  rawMarketInfo,
  tokensData,
  claimableFundingData,
}: {
  chainId: ContractsChainId;
  rawMarketInfo: RawMarketInfo;
  tokensData: TokensData;
  claimableFundingData?: ClaimableFundingData[string];
}): MarketInfo | undefined {
  const longToken = getByKey(tokensData, rawMarketInfo.longTokenAddress);
  const shortToken = getByKey(tokensData, rawMarketInfo.shortTokenAddress);
  const indexToken = getByKey(tokensData, convertTokenAddress(chainId, rawMarketInfo.indexTokenAddress, "native"));

  if (!longToken || !shortToken || !indexToken) {
    return undefined;
  }

  return {
    ...rawMarketInfo,
    ...(claimableFundingData || {}),
    longToken,
    shortToken,
    indexToken,
  };
}

export function composeFullMarketsInfoData({
  chainId,
  marketsAddresses,
  rawMarketsInfoData,
  tokensData,
  claimableFundingData,
}: {
  chainId: ContractsChainId;
  marketsAddresses: string[];
  rawMarketsInfoData: RawMarketsInfoData;
  tokensData: TokensData;
  claimableFundingData?: ClaimableFundingData;
}): MarketsInfoData {
  const data: MarketsInfoData = {};

  for (const marketAddress of marketsAddresses) {
    const rawMarketInfo = getByKey(rawMarketsInfoData, marketAddress);

    if (!rawMarketInfo) {
      continue;
    }

    const fullMarketInfo = hydrateMarketInfo({
      chainId,
      rawMarketInfo,
      tokensData,
      claimableFundingData: claimableFundingData?.[marketAddress],
    });

    if (fullMarketInfo) {
      data[marketAddress] = fullMarketInfo;
    }
  }

  return data;
}

export function getMarketWithTiers(
  marketInfo: MarketInfo,
  constants: {
    minCollateralUsd: bigint;
    minPositionSizeUsd: bigint;
  }
): MarketWithTiers {
  const maxLeverage = getMaxLeverageByMinCollateralFactor(marketInfo.minCollateralFactor);
  const maxLeverageBigint = BigInt(maxLeverage);

  const leverageTiers: LeverageTier[] = [
    {
      maxLeverage: maxLeverageBigint,
      minCollateralFactor: marketInfo.minCollateralFactor,
      maxPositionSize: undefined,
    },
  ];

  return {
    symbol: marketInfo.name,
    marketTokenAddress: marketInfo.marketTokenAddress,
    indexTokenAddress: marketInfo.indexTokenAddress,
    longTokenAddress: marketInfo.longTokenAddress,
    shortTokenAddress: marketInfo.shortTokenAddress,
    isListed: !marketInfo.isDisabled,
    listingDate: undefined,
    isSpotOnly: marketInfo.isSpotOnly,
    leverageTiers,
    minPositionSizeUsd: constants.minPositionSizeUsd,
    minCollateralUsd: constants.minCollateralUsd,
  };
}

export function getMarketAddressByName(marketsInfoData: MarketsInfoData, name: string): string | undefined {
  const poolMatch = name.match(/\[([^\]]+)\]/);
  if (!poolMatch) {
    return undefined;
  }

  const poolTokens = poolMatch[1].split("-");

  if (poolTokens.length !== 2) {
    return undefined;
  }

  const [longTokenSymbol, shortTokenSymbol] = poolTokens.map((s) => s.trim());

  const isSpotOnly = name.startsWith("SWAP-ONLY");
  let indexTokenSymbol: string | undefined;

  if (!isSpotOnly) {
    const indexMatch = name.match(/^([^/]+)\/USD/);
    if (!indexMatch) {
      return undefined;
    }
    indexTokenSymbol = indexMatch[1].trim();
  }

  for (const [marketAddress, marketInfo] of Object.entries(marketsInfoData)) {
    const matchesLong =
      marketInfo.longToken.symbol === longTokenSymbol || marketInfo.longToken.baseSymbol === longTokenSymbol;
    const matchesShort =
      marketInfo.shortToken.symbol === shortTokenSymbol || marketInfo.shortToken.baseSymbol === shortTokenSymbol;
    const matchesIndex = isSpotOnly
      ? marketInfo.isSpotOnly && marketInfo.indexTokenAddress === zeroAddress
      : (marketInfo.indexToken.symbol === indexTokenSymbol || marketInfo.indexToken.baseSymbol === indexTokenSymbol) &&
        !marketInfo.isSpotOnly;

    if (matchesLong && matchesShort && matchesIndex) {
      return marketAddress;
    }
  }

  return undefined;
}
