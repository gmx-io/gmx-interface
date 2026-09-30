import { describe, expect, it } from "vitest";

import { ARBITRUM } from "sdk/configs/chainIds";
import { getTokenBySymbol } from "sdk/configs/tokens";
import type { TokenData } from "sdk/utils/tokens/types";

import { getMaxAvailableTokenAmount, shouldShowGasPaymentTokenWarning } from "./useMaxAvailableAmount";

const USDC = getTokenBySymbol(ARBITRUM, "USDC");
const USDC_UNIT = 10n ** 6n;
const USDC_DATA = {
  ...USDC,
  prices: {
    minPrice: 10n ** 30n,
    maxPrice: 10n ** 30n,
  },
} satisfies TokenData;

describe("gas payment token warning threshold", () => {
  const balance = 27_797_480_000n;
  const gasPaymentTokenAmount = USDC_UNIT;
  const maxDetails = getMaxAvailableTokenAmount({
    chainId: ARBITRUM,
    fromTokenAddress: USDC.address,
    fromTokenBalance: balance,
    gasPaymentToken: USDC_DATA,
    gasPaymentTokenBalance: balance,
    gasPaymentTokenAmount,
    useMinimalBuffer: true,
  });

  it("keeps the minimal-buffer Max while retaining the safe warning threshold", () => {
    expect(maxDetails).toEqual({
      maxAvailableAmount: 27_796_080_000n,
      safeMaxAvailableAmount: 27_776_480_000n,
      bufferType: "minimal",
    });
  });

  it("does not warn for a small swap with a large balance", () => {
    expect(
      shouldShowGasPaymentTokenWarning({
        fromTokenAmount: 3n * USDC_UNIT,
        fromTokenBalance: balance,
        maxAvailableAmount: maxDetails.maxAvailableAmount,
        safeMaxAvailableAmount: maxDetails.safeMaxAvailableAmount,
      })
    ).toBe(false);
  });

  it("warns when a near-Max swap consumes the safe gas reserve", () => {
    expect(
      shouldShowGasPaymentTokenWarning({
        fromTokenAmount: 27_796n * USDC_UNIT,
        fromTokenBalance: balance,
        maxAvailableAmount: maxDetails.maxAvailableAmount,
        safeMaxAvailableAmount: maxDetails.safeMaxAvailableAmount,
      })
    ).toBe(true);
  });

  it("still warns when a low balance can only support the minimal buffer", () => {
    const lowBalance = 1_500_000n;
    const lowBalanceMaxDetails = getMaxAvailableTokenAmount({
      chainId: ARBITRUM,
      fromTokenAddress: USDC.address,
      fromTokenBalance: lowBalance,
      gasPaymentToken: USDC_DATA,
      gasPaymentTokenBalance: lowBalance,
      gasPaymentTokenAmount,
    });

    expect(lowBalanceMaxDetails.bufferType).toBe("minimal");
    expect(
      shouldShowGasPaymentTokenWarning({
        fromTokenAmount: 50_000n,
        fromTokenBalance: lowBalance,
        maxAvailableAmount: lowBalanceMaxDetails.maxAvailableAmount,
        safeMaxAvailableAmount: lowBalanceMaxDetails.safeMaxAvailableAmount,
      })
    ).toBe(true);
  });
});
