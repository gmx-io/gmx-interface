import { BigNumber } from "ethers";

import type { MarketsInfoData } from "domain/synthetics/markets/types";
import { marketsInfoDataToIndexTokensStats } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { bigNumberify } from "lib/numbers";

import mockData from "./marketsInfoDataToIndexTokensStats.data.json";

const big = (hex: string) => bigNumberify(hex) as BigNumber;
const mapValues = <T, U>(obj: Record<string, T>, fn: (value: T) => U) => {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, fn(value)])) as Record<string, U>;
};

const prepare = <T>(raw: any): T => {
  const prepareHelper = (value: any) => {
    if (typeof value === "object" && value && value.type === "BigNumber") {
      return big(value.hex);
    }

    if (typeof value === "object" && value) {
      return mapValues(value, prepareHelper);
    } else {
      return value;
    }
  };
  return prepareHelper(raw) as T;
};

describe("marketsInfoDataToIndexTokensStats", () => {
  it("matches snapshot", () => {
    const input = prepare<MarketsInfoData>(mockData);

    const result = marketsInfoDataToIndexTokensStats(input);

    expect(result).toMatchSnapshot();
  });
});
