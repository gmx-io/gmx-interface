import { parseUnits } from "viem";
import { describe, expect, it } from "vitest";

import { mockMarketsInfoData, mockTokensData } from "test/mock";
import { getLiquidationPrice } from "utils/positions";
import { convertToUsd, getTokenData } from "utils/tokens";
import type { TokensData } from "utils/tokens/types";

const usd = (value: string) => parseUnits(value, 30);

const SOL_PRICES = { minPrice: usd("90.13415638943"), maxPrice: usd("90.14466941829") };
const SOLANA_TOKENS = mockTokensData({
  SOL: { decimals: 9, isSynthetic: true, wrappedAddress: "WSOL", prices: SOL_PRICES },
  WSOL: { address: "WSOL", name: "Wrapped SOL", symbol: "WSOL", decimals: 9, prices: SOL_PRICES },
});
const ETH_PRICE = usd("2238.122929246671");
const ARBITRUM_TOKENS = mockTokensData({ ETH: { prices: { minPrice: ETH_PRICE, maxPrice: ETH_PRICE } } });

// expected prices are where the on-chain check flips with the index and the collateral priced together: gmsol
// check_liquidatable at Solana slot 465909818, Reader.isPositionLiquidatable at Arbitrum block 521637011
const POSITIONS = [
  {
    name: "Solana SOL/USD [WSOL-USDC] short hedged with WSOL",
    tokensData: SOLANA_TOKENS,
    marketKey: "SOL-WSOL-USDC",
    collateral: "WSOL",
    minCollateralFactorForLiquidation: usd("0.002"),
    positionFeeFactor: usd("0.00024"),
    isLong: false,
    sizeInUsd: usd("1376.5882053631356223632"),
    sizeInTokens: 10992122336n,
    collateralAmount: 10992741533n,
    fundingFeeAmount: 6983133321n,
    pendingBorrowingFeesUsd: usd("171.18769755591283668544"),
    expected: usd("172.19757705077"),
  },
  {
    name: "Solana SOL/USD [WSOL-USDC] long",
    tokensData: SOLANA_TOKENS,
    marketKey: "SOL-WSOL-USDC",
    collateral: "WSOL",
    minCollateralFactorForLiquidation: usd("0.002"),
    positionFeeFactor: usd("0.00024"),
    isLong: true,
    sizeInUsd: usd("407.70624"),
    sizeInTokens: 4133555257n,
    collateralAmount: 3997514425n,
    fundingFeeAmount: 357457132n,
    pendingBorrowingFeesUsd: usd("24.99637549702965067211"),
    expected: usd("55.80423029499"),
  },
  {
    name: "Arbitrum ETH/USD [WETH-USDC] short",
    tokensData: ARBITRUM_TOKENS,
    marketKey: "ETH-ETH-USDC",
    collateral: "ETH",
    minCollateralFactorForLiquidation: usd("0.005"),
    positionFeeFactor: usd("0.0006"),
    isLong: false,
    sizeInUsd: usd("2740036.31980427626177387123979331729"),
    sizeInTokens: 799909837986426323532n,
    collateralAmount: 587819787400706175153n,
    fundingFeeAmount: 44129191041547970203n,
    pendingBorrowingFeesUsd: usd("101994.985119321664697627456589705987"),
    expected: usd("10236.1443"),
  },
];

function getMarketInfo(
  tokensData: TokensData,
  marketKey: string,
  minCollateralFactorForLiquidation: bigint,
  fee: bigint
) {
  return mockMarketsInfoData(tokensData, [marketKey], {
    [marketKey]: {
      minCollateralFactorForLiquidation,
      positionFeeFactorForBalanceWasNotImproved: fee,
      positionImpactFactorPositive: 0n,
      positionImpactFactorNegative: 0n,
      longInterestUsd: 0n,
      shortInterestUsd: 0n,
      longInterestInTokens: 0n,
      shortInterestInTokens: 0n,
    },
  })[marketKey];
}

describe("getLiquidationPrice with the index token's twin as collateral", () => {
  it("matches the on-chain liquidation boundary of recorded positions", () => {
    for (const position of POSITIONS) {
      const marketInfo = getMarketInfo(
        position.tokensData,
        position.marketKey,
        position.minCollateralFactorForLiquidation,
        position.positionFeeFactor
      );
      const collateralToken = getTokenData(position.tokensData, position.collateral)!;
      const toUsd = (amount: bigint) =>
        convertToUsd(amount, collateralToken.decimals, collateralToken.prices.minPrice)!;

      const liquidationPrice = getLiquidationPrice({
        marketInfo,
        collateralToken,
        sizeInUsd: position.sizeInUsd,
        sizeInTokens: position.sizeInTokens,
        collateralAmount: position.collateralAmount,
        collateralUsd: toUsd(position.collateralAmount),
        pendingFundingFeesUsd: toUsd(position.fundingFeeAmount),
        pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
        pendingImpactAmount: 0n,
        minCollateralUsd: usd("1"),
        isLong: position.isLong,
        userReferralInfo: undefined,
      });

      expect(liquidationPrice, position.name).toBeDefined();
      expect(Math.abs(Number(liquidationPrice!) / Number(position.expected) - 1), position.name).toBeLessThan(1e-4);
    }
  });
});
