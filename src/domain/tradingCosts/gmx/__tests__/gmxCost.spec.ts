import { describe, expect, it } from "vitest";

import type { GasLimitsConfig } from "domain/synthetics/fees";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { ETH_TOKEN } from "domain/testUtils/mockTokens";
import { expandDecimals } from "lib/numbers";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { getGmxTradingCostBreakdown } from "../gmxCost";

const feeFactor = expandDecimals(5, 26);
const zeroGasLimits: GasLimitsConfig = {
  depositToken: 0n,
  withdrawalMultiToken: 0n,
  shift: 0n,
  singleSwap: 0n,
  swapOrder: 0n,
  increaseOrder: 0n,
  decreaseOrder: 0n,
  estimatedGasFeeBaseAmount: 0n,
  estimatedGasFeePerOraclePrice: 0n,
  estimatedFeeMultiplierFactor: 0n,
  gelatoRelayFeeMultiplierFactor: 0n,
  glvDepositGasLimit: 0n,
  glvWithdrawalGasLimit: 0n,
  glvPerMarketGasLimit: 0n,
  createOrderGasLimit: 0n,
  updateOrderGasLimit: 0n,
  cancelOrderGasLimit: 0n,
  tokenPermitGasLimit: 0n,
  gmxAccountCollateralGasLimit: 0n,
};

describe("GMX trading cost adapter", () => {
  it("includes protocol fees on both open and close legs", () => {
    const marketInfo = {
      ...createMockMarketInfo(),
      positionFeeFactorForBalanceWasImproved: feeFactor,
      positionFeeFactorForBalanceWasNotImproved: feeFactor,
      positionImpactFactorPositive: 0n,
      positionImpactFactorNegative: 0n,
      fundingFactorPerSecond: 0n,
      borrowingFactorPerSecondForLongs: 0n,
      borrowingFactorPerSecondForShorts: 0n,
    };

    const sizeUsd = expandDecimals(10_000, 30);
    const breakdown = getGmxTradingCostBreakdown({
      marketInfo,
      sizeUsd,
      side: "long",
      holdingPeriodHours: 8,
      gasLimits: undefined,
      gasPrice: undefined,
      tokensData: undefined,
      timestamp: 1000,
    });

    expect(breakdown.status).toBe("ready");
    expect(breakdown.components.find((item) => item.key === "protocolFee")?.usd).toBe(expandDecimals(10, 30));
    expect(breakdown.components.find((item) => item.key === "openPriceImpact")?.usd).toBe(0n);
    expect(breakdown.components.find((item) => item.key === "closePriceImpact")?.usd).toBe(0n);
    expect(breakdown.warnings).toContain("Collateral swap routing is not included.");
  });

  it("uses the not-improved position fee factor for the close leg", () => {
    const sizeUsd = expandDecimals(10_000, 30);
    const marketInfo = {
      ...createMockMarketInfo(),
      longInterestUsd: expandDecimals(1_000_000, 30),
      shortInterestUsd: expandDecimals(100_000, 30),
      useOpenInterestInTokensForBalance: false,
      positionFeeFactorForBalanceWasImproved: 0n,
      positionFeeFactorForBalanceWasNotImproved: expandDecimals(1, 27),
      positionImpactFactorPositive: 0n,
      positionImpactFactorNegative: 0n,
      fundingFactorPerSecond: 0n,
      borrowingFactorPerSecondForLongs: 0n,
      borrowingFactorPerSecondForShorts: 0n,
    };

    const breakdown = getGmxTradingCostBreakdown({
      marketInfo,
      sizeUsd,
      side: "long",
      holdingPeriodHours: 1,
      gasLimits: undefined,
      gasPrice: undefined,
      tokensData: undefined,
      timestamp: 1000,
    });

    expect(breakdown.components.find((item) => item.key === "protocolFee")?.usd).toBe(expandDecimals(20, 30));
  });

  it("converts positive price impact into a negative cost", () => {
    const marketInfo = {
      ...createMockMarketInfo(),
      longInterestUsd: expandDecimals(100_000, 30),
      shortInterestUsd: expandDecimals(1_000_000, 30),
      useOpenInterestInTokensForBalance: false,
      positionFeeFactorForBalanceWasImproved: 0n,
      positionFeeFactorForBalanceWasNotImproved: 0n,
      borrowingFactorPerSecondForLongs: 0n,
      borrowingFactorPerSecondForShorts: 0n,
      fundingFactorPerSecond: 0n,
    };

    const breakdown = getGmxTradingCostBreakdown({
      marketInfo,
      sizeUsd: expandDecimals(10_000, 30),
      side: "long",
      holdingPeriodHours: 1,
      gasLimits: undefined,
      gasPrice: undefined,
      tokensData: undefined,
      timestamp: 1000,
    });

    expect(breakdown.components.find((item) => item.key === "openPriceImpact")!.usd).toBeLessThanOrEqual(0n);
  });

  it("calculates close price impact after the simulated open leg", () => {
    const marketInfo = {
      ...createMockMarketInfo(),
      longInterestUsd: 0n,
      shortInterestUsd: 0n,
      longInterestInTokens: 0n,
      shortInterestInTokens: 0n,
      useOpenInterestInTokensForBalance: false,
      positionFeeFactorForBalanceWasImproved: 0n,
      positionFeeFactorForBalanceWasNotImproved: 0n,
      borrowingFactorPerSecondForLongs: 0n,
      borrowingFactorPerSecondForShorts: 0n,
      fundingFactorPerSecond: 0n,
    };

    const breakdown = getGmxTradingCostBreakdown({
      marketInfo,
      sizeUsd: expandDecimals(10_000, 30),
      side: "long",
      holdingPeriodHours: 1,
      gasLimits: undefined,
      gasPrice: undefined,
      tokensData: undefined,
      timestamp: 1000,
    });

    expect(breakdown.components.find((item) => item.key === "closePriceImpact")!.usd).toBeLessThan(0n);
  });

  it("uses the order oracle price count for both network fee legs", () => {
    const gasLimits = {
      ...zeroGasLimits,
      estimatedGasFeePerOraclePrice: 10n,
    };
    const nativeToken = {
      ...ETH_TOKEN,
      address: NATIVE_TOKEN_ADDRESS,
      isNative: true,
      isWrapped: false,
      prices: { minPrice: expandDecimals(1, 30), maxPrice: expandDecimals(1, 30) },
    };

    const breakdown = getGmxTradingCostBreakdown({
      marketInfo: {
        ...createMockMarketInfo(),
        positionFeeFactorForBalanceWasImproved: 0n,
        positionFeeFactorForBalanceWasNotImproved: 0n,
        positionImpactFactorPositive: 0n,
        positionImpactFactorNegative: 0n,
        borrowingFactorPerSecondForLongs: 0n,
        borrowingFactorPerSecondForShorts: 0n,
        fundingFactorPerSecond: 0n,
      },
      sizeUsd: expandDecimals(10_000, 30),
      side: "long",
      holdingPeriodHours: 1,
      gasLimits,
      gasPrice: expandDecimals(1, 18),
      tokensData: {
        [NATIVE_TOKEN_ADDRESS]: nativeToken,
      },
      timestamp: 1000,
    });

    expect(breakdown.components.find((item) => item.key === "networkFee")?.usd).toBe(expandDecimals(60, 30));
  });

  it("marks GMX as insufficient liquidity when the requested size exceeds available position liquidity", () => {
    const breakdown = getGmxTradingCostBreakdown({
      marketInfo: {
        ...createMockMarketInfo(),
        maxOpenInterestLong: expandDecimals(5_000, 30),
        positionImpactFactorPositive: 0n,
        positionImpactFactorNegative: 0n,
        borrowingFactorPerSecondForLongs: 0n,
        borrowingFactorPerSecondForShorts: 0n,
        fundingFactorPerSecond: 0n,
      },
      sizeUsd: expandDecimals(10_000, 30),
      side: "long",
      holdingPeriodHours: 1,
      gasLimits: undefined,
      gasPrice: undefined,
      tokensData: undefined,
      timestamp: 1000,
    });

    expect(breakdown.status).toBe("insufficientLiquidity");
    expect(breakdown.totalUsd).toBeUndefined();
    expect(breakdown.components).toEqual([]);
    expect(breakdown.warnings).toContain("GMX available liquidity is lower than the requested trade size.");
  });

  it("includes JIT max reserve liquidity when checking whether GMX can fill the requested size", () => {
    const sizeUsd = expandDecimals(2_000_000, 30);
    const marketInfo = {
      ...createMockMarketInfo(),
      positionImpactFactorPositive: 0n,
      positionImpactFactorNegative: 0n,
      borrowingFactorPerSecondForLongs: 0n,
      borrowingFactorPerSecondForShorts: 0n,
      fundingFactorPerSecond: 0n,
    };

    const withoutJit = getGmxTradingCostBreakdown({
      marketInfo,
      sizeUsd,
      side: "long",
      holdingPeriodHours: 1,
      gasLimits: undefined,
      gasPrice: undefined,
      tokensData: undefined,
      timestamp: 1000,
    });
    const withJit = getGmxTradingCostBreakdown({
      marketInfo,
      sizeUsd,
      side: "long",
      holdingPeriodHours: 1,
      gasLimits: undefined,
      gasPrice: undefined,
      tokensData: undefined,
      maxReservedUsdWithJit: expandDecimals(3_000_000, 30),
      timestamp: 1000,
    });

    expect(withoutJit.status).toBe("insufficientLiquidity");
    expect(withJit.status).toBe("ready");
  });
});
