import { getLiquidationPrice } from "lib/legacy";
import { bigNumberify, expandDecimals } from "lib/numbers";

describe("getLiquidationPrice", function () {
  const cases = [
    {
      name: "simple by max leverage",
      isLong: true,
      size: expandDecimals(50000, 30),
      collateral: expandDecimals(10000, 30),
      averagePrice: expandDecimals(50000, 30),
      entryFundingRate: bigNumberify(95000),
      cumulativeFundingRate: bigNumberify(100000),
      expected: expandDecimals(40500, 30),
    },
    {
      name: "liq price by fees",
      isLong: true,
      size: expandDecimals(50000, 30),
      collateral: expandDecimals(10000, 30),
      averagePrice: expandDecimals(50000, 30),
      entryFundingRate: bigNumberify(80000),
      cumulativeFundingRate: bigNumberify(100000),
      expected: expandDecimals(41055, 30),
    },
    {
      name: "with size increase",
      isLong: true,
      size: expandDecimals(50000, 30),
      collateral: expandDecimals(10000, 30),
      averagePrice: expandDecimals(50000, 30),
      entryFundingRate: bigNumberify(95000),
      cumulativeFundingRate: bigNumberify(100000),
      expected: expandDecimals(45525, 30),
      sizeDelta: expandDecimals(50000, 30),
      increaseSize: true,
    },
    {
      name: "with size decrease",
      isLong: true,
      size: expandDecimals(50000, 30),
      collateral: expandDecimals(10000, 30),
      averagePrice: expandDecimals(50000, 30),
      entryFundingRate: bigNumberify(95000),
      cumulativeFundingRate: bigNumberify(100000),
      expected: expandDecimals(30660, 30),
      sizeDelta: expandDecimals(25000, 30),
    },
    {
      name: "with pending losses",
      isLong: true,
      size: expandDecimals(50000, 30),
      collateral: expandDecimals(10000, 30),
      averagePrice: expandDecimals(50000, 30),
      entryFundingRate: bigNumberify(95000),
      cumulativeFundingRate: bigNumberify(100000),
      sizeDelta: expandDecimals(25000, 30),
      hasProfit: false,
      delta: expandDecimals(5000, 30),
      includeDelta: true,
      expected: expandDecimals(35660, 30),
    },
    {
      name: "with pending profit (no difference)",
      isLong: true,
      size: expandDecimals(50000, 30),
      collateral: expandDecimals(10000, 30),
      averagePrice: expandDecimals(50000, 30),
      entryFundingRate: bigNumberify(95000),
      cumulativeFundingRate: bigNumberify(100000),
      sizeDelta: expandDecimals(25000, 30),
      hasProfit: true,
      delta: expandDecimals(5000, 30),
      includeDelta: true,
      expected: expandDecimals(30660, 30),
    },
    ////
    {
      name: "decrease collateral",
      isLong: true,
      size: expandDecimals(50000, 30),
      collateral: expandDecimals(10000, 30),
      averagePrice: expandDecimals(50000, 30),
      entryFundingRate: bigNumberify(95000),
      cumulativeFundingRate: bigNumberify(100000),
      expected: expandDecimals(41500, 30),
      collateralDelta: expandDecimals(1000, 30),
    },
    {
      name: "increase collateral",
      isLong: true,
      size: expandDecimals(50000, 30),
      collateral: expandDecimals(10000, 30),
      averagePrice: expandDecimals(50000, 30),
      entryFundingRate: bigNumberify(95000),
      cumulativeFundingRate: bigNumberify(100000),
      expected: expandDecimals(39500, 30),
      collateralDelta: expandDecimals(1000, 30),
      increaseCollateral: true,
    },
  ];

  for (const { name: caseName, expected, ...case_ } of cases) {
    it(`getLiquidationPrice: ${caseName}`, function () {
      const liqPrice = getLiquidationPrice(case_);

      expect(liqPrice).toEqual(expected);
    });
  }
});
