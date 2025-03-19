import { USD_DECIMALS } from "configs/factors";
import { NATIVE_TOKEN_ADDRESS } from "configs/tokens";
import type { MarketsInfoData } from "types/markets";
import { getSwapPathOutputAddresses, getSwapPathStats } from "../swapStats";
import { describe, expect, it } from "vitest";
import { mockMarketsInfoData as createMockMarketsInfoData, mockTokensData, usdToToken } from "../../../test/mock";

const someWrappedToken = "0x0000000000000000000000000000000000000001";
const someNativeToken = "0x0000000000000000000000000000000000000000";
const unrelatedToken = "0x0000000000000000000000000000000000000002";

const marketA = "0x0000000000000000000000000000000000000003";
const marketB = "0x0000000000000000000000000000000000000004";

const mockMarketsInfoData = {
  [marketA]: {
    longToken: {
      address: someWrappedToken,
    },
    shortToken: {
      address: unrelatedToken,
    },
  },
  [marketB]: {
    longToken: {
      address: unrelatedToken,
    },
    shortToken: {
      address: someWrappedToken,
    },
  },
} as unknown as MarketsInfoData;

describe("getSwapPathOutputAddresses", () => {
  type Input = Parameters<typeof getSwapPathOutputAddresses>[0];

  it("increase, pay native, collateral wrapped, swap empty", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [],
      initialCollateralAddress: someWrappedToken,
      isIncrease: true,
      shouldUnwrapNativeToken: true,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: someWrappedToken,
      outMarketAddress: undefined,
    });
  });

  it("increase, pay native, collateral unrelated", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [marketA],
      initialCollateralAddress: someWrappedToken,
      isIncrease: true,
      shouldUnwrapNativeToken: true,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: unrelatedToken,
      outMarketAddress: undefined,
    });
  });

  it("increase, pay wrapped, collateral wrapped, swap empty", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [],
      initialCollateralAddress: someWrappedToken,
      isIncrease: true,
      shouldUnwrapNativeToken: false,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: someWrappedToken,
      outMarketAddress: undefined,
    });
  });

  it("increase, pay wrapped, collateral unrelated", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [marketA],
      initialCollateralAddress: someWrappedToken,
      isIncrease: true,
      shouldUnwrapNativeToken: false,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: unrelatedToken,
      outMarketAddress: undefined,
    });
  });

  it("increase, pay unrelated, collateral unrelated, swap empty", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [],
      initialCollateralAddress: unrelatedToken,
      isIncrease: true,
      shouldUnwrapNativeToken: false,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: unrelatedToken,
      outMarketAddress: undefined,
    });
  });

  it("increase, pay native, collateral wrapped, swap NOT empty", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [marketB, marketA],
      initialCollateralAddress: someWrappedToken,
      isIncrease: true,
      shouldUnwrapNativeToken: true,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: someWrappedToken,
      outMarketAddress: undefined,
    });
  });

  it("decrease, pay native, collateral wrapped, swap empty", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [],
      initialCollateralAddress: someWrappedToken,
      isIncrease: false,
      shouldUnwrapNativeToken: true,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: someNativeToken,
      outMarketAddress: undefined,
    });
  });

  it("decrease, pay native, collateral unrelated", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [marketA],
      initialCollateralAddress: someWrappedToken,
      isIncrease: false,
      shouldUnwrapNativeToken: true,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: unrelatedToken,
      outMarketAddress: undefined,
    });
  });

  it("decrease, pay wrapped, collateral wrapped, swap empty", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [],
      initialCollateralAddress: someWrappedToken,
      isIncrease: false,
      shouldUnwrapNativeToken: false,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: someWrappedToken,
      outMarketAddress: undefined,
    });
  });

  it("decrease, pay wrapped, collateral unrelated", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [marketA],
      initialCollateralAddress: someWrappedToken,
      isIncrease: false,
      shouldUnwrapNativeToken: false,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: unrelatedToken,
      outMarketAddress: undefined,
    });
  });

  it("decrease, pay unrelated, collateral unrelated, swap empty", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [],
      initialCollateralAddress: unrelatedToken,
      isIncrease: false,
      shouldUnwrapNativeToken: false,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: unrelatedToken,
      outMarketAddress: undefined,
    });
  });

  it("decreases, pay native, collateral wrapped, swap NOT empty", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [marketB, marketA],
      initialCollateralAddress: someWrappedToken,
      isIncrease: false,
      shouldUnwrapNativeToken: true,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: someNativeToken,
      outMarketAddress: undefined,
    });
  });
});

describe("getSwapPathStats", () => {
  const marketKeys = ["ETH-WETH-USDC", "BTC-BTC-USDC", "BTC-BTC-WETH"];
  const tokensData = mockTokensData({
    ETH: {
      isNative: true,
      wrappedAddress: "WETH",
    },
    WETH: {
      ...mockTokensData().ETH,
      wrappedAddress: undefined,
      address: "WETH",
      isWrapped: true,
      isNative: false,
    },
    USDC: {
      isNative: false,
    },
    BTC: {
      isNative: false,
    },
  });
  const testMarketsInfoData = createMockMarketsInfoData(tokensData, marketKeys, {
    "ETH-WETH-USDC": {
      longPoolAmount: usdToToken(100_000, tokensData.WETH),
      shortPoolAmount: usdToToken(100_000, tokensData.USDC),
    },
    "BTC-BTC-USDC": {
      longPoolAmount: usdToToken(100_000, tokensData.BTC),
      shortPoolAmount: usdToToken(100_000, tokensData.USDC),
    },
    "BTC-BTC-WETH": {
      longPoolAmount: usdToToken(100_000, tokensData.BTC),
      shortPoolAmount: usdToToken(100_000, tokensData.WETH),
    },
  });

  const dollar = 10n ** BigInt(USD_DECIMALS);

  it("returns undefined for empty swap path", () => {
    const result = getSwapPathStats({
      marketsInfoData: testMarketsInfoData,
      swapPath: [],
      initialCollateralAddress: tokensData.ETH.address,
      wrappedNativeTokenAddress: tokensData.WETH.address,
      usdIn: 100n * dollar,
      shouldUnwrapNativeToken: false,
      shouldApplyPriceImpact: true,
    });

    expect(result).toBeUndefined();
  });

  it("calculates stats for single-hop swap", () => {
    const result = getSwapPathStats({
      marketsInfoData: testMarketsInfoData,
      swapPath: ["ETH-WETH-USDC"],
      initialCollateralAddress: tokensData.ETH.wrappedAddress!,
      wrappedNativeTokenAddress: tokensData.WETH.address,
      usdIn: 100n * dollar,
      shouldUnwrapNativeToken: false,
      shouldApplyPriceImpact: true,
    });

    expect(result).toBeDefined();
    expect(result?.swapPath).toEqual(["ETH-WETH-USDC"]);
    expect(result?.swapSteps).toHaveLength(1);
    expect(result?.tokenInAddress).toBe(tokensData.ETH.wrappedAddress!);
    expect(result?.tokenOutAddress).toBe(tokensData.USDC.address);
    expect(result?.targetMarketAddress).toBe("ETH-WETH-USDC");
    expect(result?.usdOut).toBeLessThan(100n * dollar); // Due to fees and price impact
    expect(result?.totalSwapFeeUsd).toBeGreaterThan(0n);
    expect(result?.totalSwapPriceImpactDeltaUsd).toBeLessThan(0n); // Negative impact
    expect(result?.totalFeesDeltaUsd).toBeLessThan(0n); // Total fees are negative
  });

  it("calculates stats for multi-hop swap", () => {
    const result = getSwapPathStats({
      marketsInfoData: testMarketsInfoData,
      swapPath: ["BTC-BTC-WETH", "BTC-BTC-USDC"],
      initialCollateralAddress: tokensData.ETH.wrappedAddress!,
      wrappedNativeTokenAddress: tokensData.WETH.address,
      usdIn: 100n * dollar,
      shouldUnwrapNativeToken: false,
      shouldApplyPriceImpact: true,
    });

    expect(result).toBeDefined();
    expect(result?.swapPath).toEqual(["BTC-BTC-WETH", "BTC-BTC-USDC"]);
    expect(result?.swapSteps).toHaveLength(2);
    expect(result?.tokenInAddress).toBe(tokensData.ETH.wrappedAddress!);
    expect(result?.tokenOutAddress).toBe(tokensData.USDC.address);
    expect(result?.targetMarketAddress).toBe("BTC-BTC-USDC");
    expect(result?.usdOut).toBeLessThan(100n * dollar); // Due to fees and price impact
    expect(result?.totalSwapFeeUsd).toBeGreaterThan(0n);
    expect(result?.totalSwapPriceImpactDeltaUsd).toBeLessThan(0n); // Negative impact
    expect(result?.totalFeesDeltaUsd).toBeLessThan(0n); // Total fees are negative
  });

  it("handles native token unwrapping", () => {
    const result = getSwapPathStats({
      marketsInfoData: testMarketsInfoData,
      swapPath: ["ETH-WETH-USDC"],
      initialCollateralAddress: tokensData.USDC.address,
      wrappedNativeTokenAddress: tokensData.WETH.address,
      usdIn: 100n * dollar,
      shouldUnwrapNativeToken: true,
      shouldApplyPriceImpact: true,
    });

    expect(result).toBeDefined();
    expect(result?.tokenOutAddress).toBe(NATIVE_TOKEN_ADDRESS);
  });

  it("handles non-existent market in path", () => {
    const result = getSwapPathStats({
      marketsInfoData: testMarketsInfoData,
      swapPath: ["NONEXISTENT-MARKET"],
      initialCollateralAddress: tokensData.ETH.address,
      wrappedNativeTokenAddress: tokensData.WETH.address,
      usdIn: 100n * dollar,
      shouldUnwrapNativeToken: false,
      shouldApplyPriceImpact: true,
    });

    expect(result).toBeUndefined();
  });

  it("applies price impact when shouldApplyPriceImpact is true", () => {
    const resultWithImpact = getSwapPathStats({
      marketsInfoData: testMarketsInfoData,
      swapPath: ["ETH-WETH-USDC"],
      initialCollateralAddress: tokensData.ETH.wrappedAddress!,
      wrappedNativeTokenAddress: tokensData.WETH.address,
      usdIn: 100n * dollar,
      shouldUnwrapNativeToken: false,
      shouldApplyPriceImpact: true,
    });

    const resultWithoutImpact = getSwapPathStats({
      marketsInfoData: testMarketsInfoData,
      swapPath: ["ETH-WETH-USDC"],
      initialCollateralAddress: tokensData.ETH.wrappedAddress!,
      wrappedNativeTokenAddress: tokensData.WETH.address,
      usdIn: 100n * dollar,
      shouldUnwrapNativeToken: false,
      shouldApplyPriceImpact: false,
    });

    if (!resultWithImpact || !resultWithoutImpact) {
      throw new Error("Results should be defined");
    }

    expect(resultWithImpact.usdOut).toBeLessThan(resultWithoutImpact.usdOut);
  });

  it("accumulates fees and price impact across multiple hops", () => {
    const result = getSwapPathStats({
      marketsInfoData: testMarketsInfoData,
      swapPath: ["BTC-BTC-WETH", "BTC-BTC-USDC"],
      initialCollateralAddress: tokensData.ETH.wrappedAddress!,
      wrappedNativeTokenAddress: tokensData.WETH.address,
      usdIn: 100n * dollar,
      shouldUnwrapNativeToken: false,
      shouldApplyPriceImpact: true,
    });

    expect(result).toBeDefined();
    expect(result?.swapSteps).toHaveLength(2);

    if (!result) {
      throw new Error("Result should be defined");
    }

    // Total fees should be sum of individual step fees
    const totalFeesFromSteps = result.swapSteps.reduce((sum, step) => sum + step.swapFeeUsd, 0n);
    expect(result.totalSwapFeeUsd).toBe(totalFeesFromSteps);

    // Total price impact should be sum of individual step impacts
    const totalImpactFromSteps = result.swapSteps.reduce((sum, step) => sum + step.priceImpactDeltaUsd, 0n);
    expect(result.totalSwapPriceImpactDeltaUsd).toBe(totalImpactFromSteps);

    // Total fees delta should be negative (fees reduce output)
    expect(result.totalFeesDeltaUsd).toBeLessThan(0n);
  });

  it("returns undefined when swap path contains market unrelated to initial collateral token", () => {
    const result = getSwapPathStats({
      marketsInfoData: testMarketsInfoData,
      swapPath: ["BTC-BTC-USDC"], // A market that doesn't contain WETH
      initialCollateralAddress: tokensData.ETH.wrappedAddress!, // WETH
      wrappedNativeTokenAddress: tokensData.WETH.address,
      usdIn: 100n * dollar,
      shouldUnwrapNativeToken: false,
      shouldApplyPriceImpact: true,
    });

    expect(result).toBeUndefined();
  });
});
