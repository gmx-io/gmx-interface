import { describe, expect, it } from "vitest";

import { getFundingPayoutOutputs } from "../fundingPayout";

describe("funding payout", () => {
  it("keeps automatic funding separate by mint and preserves amounts without a price", () => {
    const unit = 10n ** 30n;
    const longToken = {
      address: "So11111111111111111111111111111111111111112",
      name: "Wrapped SOL",
      symbol: "SOL",
      decimals: 9,
      prices: { minPrice: 200n * unit, maxPrice: 201n * unit },
    };
    const shortToken = {
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      prices: { minPrice: unit, maxPrice: unit },
    };
    const cases = [
      { fundingPayout: undefined, shortToken, expected: [] },
      { fundingPayout: { longTokenAmount: 0n, shortTokenAmount: 0n }, shortToken, expected: [] },
      {
        fundingPayout: { longTokenAmount: 10_000_000n, shortTokenAmount: 3_000_000n },
        shortToken,
        expected: [
          [longToken.address, 10_000_000n, 2n * unit],
          [shortToken.address, 3_000_000n, 3n * unit],
        ],
      },
      {
        fundingPayout: { longTokenAmount: 10_000_000n, shortTokenAmount: 20_000_000n },
        shortToken: longToken,
        expected: [[longToken.address, 30_000_000n, 6n * unit]],
      },
      {
        fundingPayout: { longTokenAmount: 0n, shortTokenAmount: 3_000_000n },
        shortToken: { ...shortToken, prices: undefined },
        expected: [[shortToken.address, 3_000_000n, undefined]],
      },
    ];

    for (const { fundingPayout, shortToken: payoutToken, expected } of cases) {
      const outputs = getFundingPayoutOutputs({ fundingPayout, longToken, shortToken: payoutToken });
      expect(outputs.map(({ token, amount, usd }) => [token.address, amount, usd])).toEqual(expected);
    }
  });
});
