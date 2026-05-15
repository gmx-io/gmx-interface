import { describe, expect, it } from "vitest";

import { getJitGlvShiftParams, parseJitLiquidityResponse } from "./utils";

describe("parseJitLiquidityResponse", () => {
  it("parses v1 JIT liquidity info", () => {
    const result = parseJitLiquidityResponse(
      {
        liquidityInfos: [
          {
            glv: "0xGlv",
            market: "0xMarket",
            maxReservedUsdWithJitLong: "100",
            maxReservedUsdWithJitShort: "200",
            glvShiftParams: [
              {
                glv: "0xGlv",
                fromMarket: "0xFrom",
                toMarket: "0xMarket",
                marketTokenAmount: "10",
                minMarketTokens: "9",
              },
            ],
          },
        ],
      },
      false
    );

    expect(result["0xmarket"]).toEqual({
      glv: "0xGlv",
      maxReservedUsdWithJitLong: 100n,
      maxReservedUsdWithJitShort: 200n,
      glvShiftParams: [
        {
          glv: "0xGlv",
          fromMarket: "0xFrom",
          toMarket: "0xMarket",
          marketTokenAmount: 10n,
          minMarketTokens: 9n,
        },
      ],
      glvShiftParamsLong: [
        {
          glv: "0xGlv",
          fromMarket: "0xFrom",
          toMarket: "0xMarket",
          marketTokenAmount: 10n,
          minMarketTokens: 9n,
        },
      ],
      glvShiftParamsShort: [
        {
          glv: "0xGlv",
          fromMarket: "0xFrom",
          toMarket: "0xMarket",
          marketTokenAmount: 10n,
          minMarketTokens: 9n,
        },
      ],
    });
  });

  it("parses v2 JIT liquidity info with direction-specific shift params", () => {
    const result = parseJitLiquidityResponse(
      {
        liquidityInfos: [
          {
            glv: "0xGlv",
            market: "0xMarket",
            long: {
              maxReservedUsd: "300",
              glvShiftParams: {
                glv: "0xGlv",
                fromMarket: "0xLongFrom",
                toMarket: "0xMarket",
                marketTokenAmount: "30",
                minMarketTokens: "29",
              },
            },
            short: {
              maxReservedUsd: "400",
              glvShiftParams: {
                glv: "0xGlv",
                fromMarket: "0xShortFrom",
                toMarket: "0xMarket",
                marketTokenAmount: "40",
                minMarketTokens: "39",
              },
            },
          },
        ],
      },
      true
    );

    expect(result["0xmarket"].maxReservedUsdWithJitLong).toBe(300n);
    expect(result["0xmarket"].maxReservedUsdWithJitShort).toBe(400n);
    expect(getJitGlvShiftParams(result, "0xMarket", true)).toEqual([
      {
        glv: "0xGlv",
        fromMarket: "0xLongFrom",
        toMarket: "0xMarket",
        marketTokenAmount: 30n,
        minMarketTokens: 29n,
      },
    ]);
    expect(getJitGlvShiftParams(result, "0xMarket", false)).toEqual([
      {
        glv: "0xGlv",
        fromMarket: "0xShortFrom",
        toMarket: "0xMarket",
        marketTokenAmount: 40n,
        minMarketTokens: 39n,
      },
    ]);
  });
});
