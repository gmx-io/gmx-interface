import type { MarketsInfoData } from "domain/synthetics/markets/types";
import { marketsInfoData2IndexTokenStatsMap } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { deserializeBigIntsInObject } from "lib/numbers";

import mockData from "./marketsInfoDataToIndexTokensStats.data.json";

const mapValues = <T, U>(obj: Record<string, T>, fn: (value: T) => U) => {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, fn(value)])) as Record<string, U>;
};

const prepare = <T>(raw: any): T => {
  return deserializeBigIntsInObject(raw) as T;
};

describe("marketsInfoData2IndexTokenStatsMap", () => {
  it("matches snapshot", () => {
    const input = prepare<MarketsInfoData>(mockData);

    const result = marketsInfoData2IndexTokenStatsMap(input);

    // wipe entity fields
    mapValues(result.indexMap, (value: any) => {
      value.__TEST__tokenAddress = value.token.address;
      value.__TEST__tokenSymbol = value.token.symbol;
      delete value.token;

      value.marketsStats.forEach((marketStat: any) => {
        marketStat.__TEST__marketTokenAddress = marketStat.marketInfo.marketTokenAddress;
        marketStat.__TEST__marketName = marketStat.marketInfo.name;
        delete marketStat.marketInfo;
      });
    });

    // Make the snapshot more readable
    const prettyResult = JSON.parse(
      JSON.stringify(result, (key, value) => {
        if (typeof value === "bigint") {
          return value.toLocaleString("en-US", {
            maximumFractionDigits: 4,
            notation: "scientific",
          });
        }
        return value;
      })
    );

    expect(prettyResult).toMatchSnapshot();
  });
});
