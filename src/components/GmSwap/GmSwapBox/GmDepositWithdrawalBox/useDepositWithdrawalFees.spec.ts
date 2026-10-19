import { describe, expect, it } from "vitest";

import type { TechnicalGmFees } from "domain/synthetics/markets/technicalFees/technical-fees-types";
import type { TokenData } from "domain/synthetics/tokens";
import { expandDecimals } from "lib/numbers";

import { calculateLogicalNetworkFeeUsd } from "./useDepositWithdrawalFees";

const WETH = {
  address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  symbol: "WETH",
  decimals: 18,
  prices: { minPrice: expandDecimals(1999, 30), maxPrice: expandDecimals(2001, 30) },
} as TokenData;

describe("calculateLogicalNetworkFeeUsd", () => {
  it("counts the wallet execution fee once PRO-4389", () => {
    // the execution fee is priced from this keeper gas limit (10M gas at 0.1 gwei), so the limit is not a second fee
    const technicalFees = {
      kind: "settlementChain",
      fees: { feeTokenAmount: expandDecimals(1, 15), gasLimit: 10_000_000n },
    } as TechnicalGmFees;

    expect(
      calculateLogicalNetworkFeeUsd({
        technicalFees,
        wrappedTokenData: WETH,
        sourceChainEstimatedNativeFeeUsd: undefined,
        sourceChainTxnEstimatedGasUsd: undefined,
      })
    ).toBe(-expandDecimals(2, 30));
  });
});
