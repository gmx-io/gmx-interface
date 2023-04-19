import { MarketsData } from "domain/synthetics/markets";
import { TokenData, TokensData, convertToTokenAmount, getTokenData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { USD_DECIMALS } from "lib/legacy";
import { expandDecimals } from "lib/numbers";
import { getByKey } from "lib/objects";

export function mockTokensData(overrides: { [symbol: string]: TokenData } = {}): TokensData {
  const tokens: TokensData = {
    AVAX: {
      address: "AVAX",
      name: "Avalanche",
      symbol: "AVAX",
      decimals: 18,
      isNative: true,
      prices: {
        minPrice: expandDecimals(12, 30),
        maxPrice: expandDecimals(12, 30),
      },
      ...((overrides.AVAX || {}) as any),
    },
    USDC: {
      address: "USDC",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      isStable: true,
      prices: {
        minPrice: expandDecimals(1, 30),
        maxPrice: expandDecimals(1, 30),
      },
      ...((overrides.USDC || {}) as any),
    },
    ETH: {
      address: "ETH",
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      prices: {
        minPrice: expandDecimals(1200, 30),
        maxPrice: expandDecimals(1200, 30),
      },
      ...((overrides.ETH || {}) as any),
    },
    BTC: {
      address: "BTC",
      name: "Bitcoin",
      symbol: "BTC",
      decimals: 8,
      prices: {
        minPrice: expandDecimals(20000, 30),
        maxPrice: expandDecimals(20000, 30),
      },
      ...((overrides.BTC || {}) as any),
    },
    DAI: {
      address: "DAI",
      name: "Dai",
      symbol: "DAI",
      decimals: 30,
      isStable: true,
      prices: {
        minPrice: expandDecimals(1, 30),
        maxPrice: expandDecimals(1, 30),
      },
      ...((overrides.DAI || {}) as any),
    },
    SOL: {
      address: "SOL",
      name: "Solana",
      symbol: "SOL",
      decimals: 18,
      isSynthetic: true,
      prices: {
        minPrice: expandDecimals(16, 30),
        maxPrice: expandDecimals(16, 30),
      },
      ...((overrides.SOL || {}) as any),
    },
    SPOT: {
      address: "SPOT",
      name: "SPOT",
      decimals: 30,
      symbol: "SPOT",
      prices: {
        minPrice: BigNumber.from(1),
        maxPrice: BigNumber.from(1),
      },
      ...((overrides.SPOT || {}) as any),
    },
    ...overrides,
  };

  return tokens;
}

/**
 * @param marketKeys - array of market keys in the following format: indexToken-longToken-shortToken
 */
export function mockMarketsData(marketKeys: string[]): MarketsData {
  return marketKeys.reduce((acc, key) => {
    const [indexTokenAddress, longTokenAddress, shortTokenAddress] = key.split("-");

    acc[key] = {
      marketTokenAddress: key,
      indexTokenAddress,
      longTokenAddress,
      shortTokenAddress,
      isSameCollaterals: longTokenAddress === shortTokenAddress,
      isSpotOnly: indexTokenAddress === "SPOT",
      data: "",
      name: "Test Market",
    };

    return acc;
  }, {} as MarketsData);
}

/**
 * @param marketKeys - array of market keys in the following format: indexToken-longToken-shortToken
 */
export function mockPoolsData(
  tokensData: TokensData,
  marketKeys: string[],
  overrides: { [marketKey: string]: Partial<any> } = {}
): any {
  return marketKeys.reduce((acc, key) => {
    const [indexTokenAddress, longTokenAddress, shortTokenAddress] = key.split("-");

    const indexToken = getTokenData(tokensData, indexTokenAddress)!;
    const longToken = getTokenData(tokensData, longTokenAddress)!;
    const shortToken = getTokenData(tokensData, shortTokenAddress)!;

    acc[key] = {
      longPoolAmount: usdToToken(1000, longToken),
      shortPoolAmount: usdToToken(1000, shortToken),

      reserveFactorLong: expandDecimals(5, 29),
      reserveFactorShort: expandDecimals(5, 29),

      totalBorrowingLong: BigNumber.from(0),
      totalBorrowingShort: BigNumber.from(0),

      cummulativeBorrowingFactorLong: BigNumber.from(0),
      cummulativeBorrowingFactorShort: BigNumber.from(0),

      borrowingFeeReceiverFactor: BigNumber.from(0),

      positionImpactPoolAmount: usdToToken(1000, indexToken),

      swapImpactPoolAmountLong: usdToToken(1000, longToken),
      swapImpactPoolAmountShort: usdToToken(1000, shortToken),

      netPnlMax: expandDecimals(10000, USD_DECIMALS),
      netPnlMin: expandDecimals(10000, USD_DECIMALS),

      pnlLongMax: expandDecimals(5000, USD_DECIMALS),
      pnlLongMin: expandDecimals(5000, USD_DECIMALS),
      pnlShortMax: expandDecimals(5000, USD_DECIMALS),
      pnlShortMin: expandDecimals(5000, USD_DECIMALS),

      maxPnlFactorLong: expandDecimals(5, 29),
      maxPnlFactorShort: expandDecimals(5, 29),

      maxPnlFactorForWithdrawalsLong: expandDecimals(5, 29),
      maxPnlFactorForWithdrawalsShort: expandDecimals(5, 29),

      ...(overrides[key] || {}),
    };

    return acc;
  }, {} as any);
}

export function mockFeeConfigsData(marketsKeys: string[], overrides: { [marketKey: string]: Partial<any> } = {}): any {
  return marketsKeys.reduce((acc, key) => {
    acc[key] = {
      positionFeeFactor: expandDecimals(5, 26),
      positionImpactFactorPositive: expandDecimals(2, 23),
      positionImpactFactorNegative: expandDecimals(1, 23),
      maxPositionImpactFactorPositive: expandDecimals(2, 23),
      maxPositionImpactFactorNegative: expandDecimals(1, 23),
      maxPositionImpactFactorForLiquidations: expandDecimals(1, 23),
      positionImpactExponentFactor: expandDecimals(2, 30),

      swapFeeFactor: expandDecimals(2, 27),
      swapImpactFactorPositive: expandDecimals(2, 23),
      swapImpactFactorNegative: expandDecimals(1, 23),
      swapImpactExponentFactor: expandDecimals(2, 30),

      // MarketInfo
      borrowingFactorPerSecondForLongs: BigNumber.from(0),
      borrowingFactorPerSecondForShorts: BigNumber.from(0),

      fundingPerSecond: BigNumber.from(0),
      longsPayShorts: false,
      fundingAmountPerSize_LongCollateral_LongPosition: BigNumber.from(0),
      fundingAmountPerSize_LongCollateral_ShortPosition: BigNumber.from(0),
      fundingAmountPerSize_ShortCollateral_LongPosition: BigNumber.from(0),
      fundingAmountPerSize_ShortCollateral_ShortPosition: BigNumber.from(0),

      ...(overrides[key] || {}),
    };
    return acc;
  }, {} as any);
}

export function mockOpenInterestData(
  marketsData: MarketsData,
  tokensData: TokensData,
  overrides: { [marketKey: string]: Partial<any> } = {}
): any {
  return Object.keys(marketsData).reduce((acc, key) => {
    const market = getByKey(marketsData, key)!;
    const indexToken = getTokenData(tokensData, market.indexTokenAddress)!;

    acc[key] = {
      longInterestUsd: expandDecimals(500, USD_DECIMALS),
      shortInterestUsd: expandDecimals(500, USD_DECIMALS),
      longInterestInTokens: usdToToken(500, indexToken),
      shortInterestInTokens: usdToToken(500, indexToken),
      ...(overrides[key] || {}),
    };

    return acc;
  }, {} as any);
}

export function usdToToken(usd: number, token: TokenData) {
  return convertToTokenAmount(expandDecimals(usd, 30), token.decimals, token.prices?.minPrice)!;
}
