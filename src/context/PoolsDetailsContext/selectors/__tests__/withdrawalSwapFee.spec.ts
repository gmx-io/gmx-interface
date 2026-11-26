import { describe, expect, it } from "vitest";

import { Mode, Operation } from "domain/synthetics/markets/types";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { createMockSyntheticsState } from "domain/testUtils/mockSyntheticsState";
import { ETH_ADDRESS, ETH_TOKEN, USDC_ADDRESS, USDC_TOKEN } from "domain/testUtils/mockTokens";
import { expandDecimals } from "lib/numbers";
import { applyFactor } from "sdk/utils/numbers";
import type { WithdrawalAmounts } from "sdk/utils/trade/types";

import { selectDepositWithdrawalAmounts } from "../selectDepositWithdrawalAmounts";

const SWAP_FEE_FACTOR = expandDecimals(5, 26);
const WITHDRAWAL_FEE_FACTOR = expandDecimals(3, 27);

describe("pool withdrawal to one token", () => {
  it("charges the swap fee, not the withdrawal fee, on the swap after the withdrawal, as the contract does", () => {
    const marketInfo = createMockMarketInfo(ETH_TOKEN, {
      swapFeeFactorForBalanceWasImproved: SWAP_FEE_FACTOR,
      swapFeeFactorForBalanceWasNotImproved: SWAP_FEE_FACTOR,
      withdrawalFeeFactorBalanceWasImproved: WITHDRAWAL_FEE_FACTOR,
      withdrawalFeeFactorBalanceWasNotImproved: WITHDRAWAL_FEE_FACTOR,
    });
    const marketToken = {
      ...USDC_TOKEN,
      address: marketInfo.marketTokenAddress,
      symbol: "GM",
      decimals: 18,
      prices: { minPrice: expandDecimals(1, 30), maxPrice: expandDecimals(1, 30) },
      totalSupply: expandDecimals(4_000_000, 18),
    };

    for (const receiveTokenAddress of [ETH_ADDRESS, USDC_ADDRESS]) {
      const amounts = selectDepositWithdrawalAmounts(
        createMockSyntheticsState({
          marketInfo,
          poolsDetails: {
            glvOrMarketAddress: marketInfo.marketTokenAddress,
            operation: Operation.Withdrawal,
            mode: Mode.Single,
            firstTokenAddress: receiveTokenAddress,
            focusedInput: "market",
            marketOrGlvTokenInputValue: "1000",
            withdrawalMarketTokensData: { [marketInfo.marketTokenAddress]: marketToken },
          },
        })
      ) as WithdrawalAmounts;
      const swapPathStats =
        receiveTokenAddress === ETH_ADDRESS ? amounts.shortTokenSwapPathStats : amounts.longTokenSwapPathStats;
      const [swap] = swapPathStats!.swapSteps;

      expect(swap.swapFeeUsd, receiveTokenAddress).toBe(applyFactor(swap.usdIn, SWAP_FEE_FACTOR));
    }
  });

  it("swaps through the pool even when its pool is full, as the withdrawal took those tokens out first", () => {
    const marketInfo = createMockMarketInfo(ETH_TOKEN);
    const fullMarketInfo = {
      ...marketInfo,
      maxLongPoolAmount: marketInfo.longPoolAmount,
      maxShortPoolAmount: marketInfo.shortPoolAmount,
    };
    const marketToken = {
      ...USDC_TOKEN,
      address: marketInfo.marketTokenAddress,
      symbol: "GM",
      decimals: 18,
      prices: { minPrice: expandDecimals(1, 30), maxPrice: expandDecimals(1, 30) },
      totalSupply: expandDecimals(4_000_000, 18),
    };

    for (const receiveTokenAddress of [ETH_ADDRESS, USDC_ADDRESS]) {
      const amounts = selectDepositWithdrawalAmounts(
        createMockSyntheticsState({
          marketInfo: fullMarketInfo,
          poolsDetails: {
            glvOrMarketAddress: marketInfo.marketTokenAddress,
            operation: Operation.Withdrawal,
            mode: Mode.Single,
            firstTokenAddress: receiveTokenAddress,
            focusedInput: "market",
            marketOrGlvTokenInputValue: "1000",
            withdrawalMarketTokensData: { [marketInfo.marketTokenAddress]: marketToken },
          },
        })
      ) as WithdrawalAmounts;
      const swapPathStats =
        receiveTokenAddress === ETH_ADDRESS ? amounts.shortTokenSwapPathStats : amounts.longTokenSwapPathStats;

      expect(swapPathStats?.swapPath, receiveTokenAddress).toEqual([marketInfo.marketTokenAddress]);
    }
  });
});
