import { describe, expect, it } from "vitest";

import { ARBITRUM } from "configs/chains";
import { maxCollateralSumKey, virtualInventoryForPositionsInTokensKey } from "configs/dataStore";
import { buildMarketsRiskValuesRequest, parseMarketsRiskValuesResponse } from "utils/markets/multicall";
import type { MarketRiskInput } from "utils/markets/multicall";

const market: MarketRiskInput = {
  marketTokenAddress: "0x1111111111111111111111111111111111111111",
  longTokenAddress: "0x2222222222222222222222222222222222222222",
  shortTokenAddress: "0x3333333333333333333333333333333333333333",
  virtualIndexTokenId: "0x4444444444444444444444444444444444444444444444444444444444444444",
};

function getParams(call: unknown): unknown[] {
  if (!call || typeof call !== "object" || !("params" in call)) {
    throw new Error("Expected a contract call with params");
  }

  return (call as { params: unknown[] }).params;
}

describe("market risk multicall", () => {
  it("builds max collateral and token inventory reads with the correct keys", () => {
    const request = buildMarketsRiskValuesRequest(ARBITRUM, [market]);
    const calls = request[market.marketTokenAddress].calls;

    expect(Object.keys(calls)).toEqual([
      "maxCollateralSumLongTokenLong",
      "maxCollateralSumLongTokenShort",
      "maxCollateralSumShortTokenLong",
      "maxCollateralSumShortTokenShort",
      "virtualInventoryForPositionsInTokens",
    ]);
    expect(getParams(calls.maxCollateralSumLongTokenLong)).toEqual([
      maxCollateralSumKey(market.marketTokenAddress, market.longTokenAddress, true),
    ]);
    expect(getParams(calls.maxCollateralSumLongTokenShort)).toEqual([
      maxCollateralSumKey(market.marketTokenAddress, market.longTokenAddress, false),
    ]);
    expect(getParams(calls.maxCollateralSumShortTokenLong)).toEqual([
      maxCollateralSumKey(market.marketTokenAddress, market.shortTokenAddress, true),
    ]);
    expect(getParams(calls.maxCollateralSumShortTokenShort)).toEqual([
      maxCollateralSumKey(market.marketTokenAddress, market.shortTokenAddress, false),
    ]);
    expect(getParams(calls.virtualInventoryForPositionsInTokens)).toEqual([
      virtualInventoryForPositionsInTokensKey(market.virtualIndexTokenId),
    ]);
  });

  it("uses identical collateral keys for same-collateral markets", () => {
    const sameCollateralMarket = {
      ...market,
      shortTokenAddress: market.longTokenAddress,
    };
    const calls = buildMarketsRiskValuesRequest(ARBITRUM, [sameCollateralMarket])[market.marketTokenAddress].calls;

    expect(getParams(calls.maxCollateralSumLongTokenLong)).toEqual(getParams(calls.maxCollateralSumShortTokenLong));
    expect(getParams(calls.maxCollateralSumLongTokenShort)).toEqual(getParams(calls.maxCollateralSumShortTokenShort));
  });

  it("parses complete responses and drops markets with call errors", () => {
    const values = {
      maxCollateralSumLongTokenLong: { returnValues: [1n] },
      maxCollateralSumLongTokenShort: { returnValues: [2n] },
      maxCollateralSumShortTokenLong: { returnValues: [3n] },
      maxCollateralSumShortTokenShort: { returnValues: [4n] },
      virtualInventoryForPositionsInTokens: { returnValues: [-5n] },
    };

    expect(
      parseMarketsRiskValuesResponse(
        {
          data: { [market.marketTokenAddress]: values },
          errors: {},
        },
        [market]
      )
    ).toEqual({
      [market.marketTokenAddress]: {
        maxCollateralSumLongTokenLong: 1n,
        maxCollateralSumLongTokenShort: 2n,
        maxCollateralSumShortTokenLong: 3n,
        maxCollateralSumShortTokenShort: 4n,
        virtualInventoryForPositionsInTokens: -5n,
      },
    });
    expect(
      parseMarketsRiskValuesResponse(
        {
          data: { [market.marketTokenAddress]: values },
          errors: { [market.marketTokenAddress]: { maxCollateralSumLongTokenLong: new Error("failed") } },
        },
        [market]
      )
    ).toEqual({});
  });
});
