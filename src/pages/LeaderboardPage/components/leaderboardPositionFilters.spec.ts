import { describe, expect, it } from "vitest";

import { filterLeaderboardPositions } from "./leaderboardPositionFilters";

const positions = [
  { key: "eth-long", market: "0xEthMarket", isLong: true },
  { key: "eth-short", market: "0xEthMarket", isLong: false },
  { key: "eth-alt-pool-long", market: "0xEthAltPool", isLong: true },
  { key: "btc-short", market: "0xBtcMarket", isLong: false },
];

describe("filterLeaderboardPositions", () => {
  it("filters by exact market address without including another pool for the same index asset", () => {
    expect(
      filterLeaderboardPositions(positions, [{ marketAddress: "0xEthMarket", direction: "any" }]).map(
        (position) => position.key
      )
    ).toEqual(["eth-long", "eth-short"]);
  });

  it("combines multiple markets with a side", () => {
    expect(
      filterLeaderboardPositions(positions, [
        { marketAddress: "0xEthMarket", direction: "any" },
        { marketAddress: "0xBtcMarket", direction: "any" },
        { marketAddress: "any", direction: "short" },
      ]).map((position) => position.key)
    ).toEqual(["eth-short", "btc-short"]);
  });

  it("filters long positions without a market selection", () => {
    expect(
      filterLeaderboardPositions(positions, [{ marketAddress: "any", direction: "long" }]).map(
        (position) => position.key
      )
    ).toEqual(["eth-long", "eth-alt-pool-long"]);
  });

  it("restores all positions when filters are cleared", () => {
    expect(filterLeaderboardPositions(positions, [])).toEqual(positions);
  });

  it("filters the complete result set before table pagination", () => {
    const resultSet = Array.from({ length: 21 }, (_, index) => ({
      key: `position-${index}`,
      market: index === 20 ? "0xBtcMarket" : "0xEthMarket",
      isLong: false,
    }));

    const firstPage = filterLeaderboardPositions(resultSet, [{ marketAddress: "0xBtcMarket", direction: "any" }]).slice(
      0,
      20
    );

    expect(firstPage.map((position) => position.key)).toEqual(["position-20"]);
  });
});
