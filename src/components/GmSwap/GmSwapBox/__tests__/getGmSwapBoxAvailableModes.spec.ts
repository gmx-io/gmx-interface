import { describe, expect, it } from "vitest";

import { Mode, Operation } from "domain/synthetics/markets/types";

import { getGmSwapBoxAvailableModes } from "../getGmSwapBoxAvailableModes";

const TWO_TOKEN_MARKET = { isSameCollaterals: false };
const SINGLE_TOKEN_MARKET = { isSameCollaterals: true };

describe("getGmSwapBoxAvailableModes", () => {
  it.each([
    {
      name: "a sale while withdrawal swaps work",
      market: TWO_TOKEN_MARKET,
      operation: Operation.Withdrawal,
      isWithdrawalSwapEnabled: true,
      expected: [Mode.Single, Mode.Pair],
    },
    {
      name: "a sale while withdrawal swaps are switched off",
      market: TWO_TOKEN_MARKET,
      operation: Operation.Withdrawal,
      isWithdrawalSwapEnabled: false,
      expected: [Mode.Pair],
    },
    {
      name: "a GLV sale while withdrawal swaps are switched off",
      operation: Operation.Withdrawal,
      market: undefined,
      isWithdrawalSwapEnabled: false,
      expected: [Mode.Pair],
    },
    {
      name: "a buy while withdrawal swaps are switched off",
      market: TWO_TOKEN_MARKET,
      operation: Operation.Deposit,
      isWithdrawalSwapEnabled: false,
      expected: [Mode.Single, Mode.Pair],
    },
    {
      name: "a single token pool sale, which needs no swap",
      operation: Operation.Withdrawal,
      market: SINGLE_TOKEN_MARKET,
      isWithdrawalSwapEnabled: false,
      expected: [Mode.Single],
    },
  ])("$name", ({ operation, market, isWithdrawalSwapEnabled, expected }) => {
    expect(
      getGmSwapBoxAvailableModes({ operation, market, paySource: "settlementChain", isWithdrawalSwapEnabled })
    ).toEqual(expected);
  });
});
