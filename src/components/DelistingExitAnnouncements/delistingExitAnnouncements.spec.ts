import { describe, expect, it } from "vitest";

import type { MarketInfo } from "domain/synthetics/markets/types";

import {
  buildLiquidityBodyText,
  buildPositionsBodyText,
  getDelistingMarketLabel,
  joinMarketNames,
} from "./delistingExitAnnouncements";

describe("joinMarketNames", () => {
  it("joins one name", () => expect(joinMarketNames(["TON/USD"])).toBe("TON/USD"));
  it("joins two names with 'and'", () => expect(joinMarketNames(["TON/USD", "PI/USD"])).toBe("TON/USD and PI/USD"));
  it("joins three names with commas and 'and'", () =>
    expect(joinMarketNames(["A/USD", "B/USD", "C/USD"])).toBe("A/USD, B/USD and C/USD"));
});

describe("getDelistingMarketLabel", () => {
  it("uses the index name for normal markets", () => {
    const marketInfo = { isSpotOnly: false, indexToken: { symbol: "KTA" } } as unknown as MarketInfo;
    expect(getDelistingMarketLabel(marketInfo)).toBe("KTA/USD");
  });

  it("uses the pool name for swap-only pools", () => {
    const marketInfo = {
      isSpotOnly: true,
      longToken: { symbol: "USDC" },
      shortToken: { symbol: "DAI" },
    } as unknown as MarketInfo;
    expect(getDelistingMarketLabel(marketInfo)).toBe("USDC-DAI");
  });
});

describe("buildPositionsBodyText", () => {
  it("singular market and single position", () =>
    expect(buildPositionsBodyText(["TON/USD"], 1)).toBe(
      "TON/USD is being delisted. Close your existing position as remaining positions may be auto-closed."
    ));
  it("plural markets and positions", () =>
    expect(buildPositionsBodyText(["TON/USD", "PI/USD"], 3)).toBe(
      "TON/USD and PI/USD are being delisted. Close your existing positions as remaining positions may be auto-closed."
    ));
});

describe("buildLiquidityBodyText", () => {
  it("singular pool", () =>
    expect(buildLiquidityBodyText(["KTA/USD"])).toBe(
      "KTA/USD is being delisted. Withdraw your liquidity as deposits are no longer available, or move it into GLV to keep earning."
    ));
  it("plural pools", () =>
    expect(buildLiquidityBodyText(["KTA/USD", "SATS/USD"])).toBe(
      "KTA/USD and SATS/USD are being delisted. Withdraw your liquidity as deposits are no longer available, or move it into GLV to keep earning."
    ));
});
