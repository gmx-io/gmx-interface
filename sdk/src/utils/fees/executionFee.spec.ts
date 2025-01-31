import { describe, expect, it } from "vitest";

import { NATIVE_TOKEN_ADDRESS } from "configs/tokens";

import type { GasLimitsConfig } from "types/fees";
import type { TokensData } from "types/tokens";

import { getExecutionFee } from "./executionFee";
import { expandDecimals } from "utils/numbers";
import { ARBITRUM } from "configs/chains";

describe("getExecutionFee", () => {
  const chainId = ARBITRUM;
  const gasLimits = {
    estimatedGasFeeBaseAmount: 600000n,
    estimatedGasFeePerOraclePrice: 250000n,
    estimatedFeeMultiplierFactor: 1000000000000000000000000000000n,
  } as GasLimitsConfig;

  const tokensData = {
    "0xAddress": {
      decimals: 18,
      prices: {
        minPrice: expandDecimals(5, 18),
      },
    },
    [NATIVE_TOKEN_ADDRESS]: {
      decimals: 18,
      prices: {
        minPrice: expandDecimals(2, 18),
      },
    },
  } as unknown as TokensData;

  it("should return undefined if native token is not found", () => {
    const result = getExecutionFee(chainId, gasLimits, {}, 0n, 0n, 0n);
    expect(result).toBeUndefined();
  });

  it("should return feeUsd for native token 1-2 price", () => {
    const result = getExecutionFee(chainId, gasLimits, tokensData, 5000000n, 2750000001n, 4n);
    expect(result).toEqual({
      feeUsd: 36300000013200000n,
      feeTokenAmount: 18150000006600000n,
      gasLimit: 6600000n,
      feeToken: tokensData[NATIVE_TOKEN_ADDRESS],
      isFeeHigh: false,
      isFeeVeryHigh: false,
    });
  });

  it("should return isFeeHigh", () => {
    const result = getExecutionFee(chainId, gasLimits, tokensData, 5000000n, expandDecimals(5, 23), 4n);
    expect(result).toEqual({
      feeUsd: 6600000000000000000000000000000n,
      gasLimit: 6600000n,
      feeTokenAmount: 3300000000000000000000000000000n,
      feeToken: tokensData[NATIVE_TOKEN_ADDRESS],
      isFeeHigh: true,
      isFeeVeryHigh: false,
    });
  });

  it("should return isFeeHigh", () => {
    const result = getExecutionFee(chainId, gasLimits, tokensData, 5000000n, expandDecimals(1, 25), 4n);
    expect(result).toEqual({
      feeUsd: 132000000000000000000000000000000n,
      feeTokenAmount: 66000000000000000000000000000000n,
      gasLimit: 6600000n,
      feeToken: tokensData[NATIVE_TOKEN_ADDRESS],
      isFeeHigh: true,
      isFeeVeryHigh: true,
    });
  });
});
