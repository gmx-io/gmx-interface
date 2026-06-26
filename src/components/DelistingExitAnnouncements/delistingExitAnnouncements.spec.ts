import { beforeEach, describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import type { MarketInfo } from "domain/synthetics/markets/types";

import {
  DELISTING_ANNOUNCEMENT_COOLDOWN_MS,
  buildLiquidityBodyText,
  buildPositionsBodyText,
  computeAffectedLiquidityMarkets,
  computeAffectedPositionMarkets,
  getDelistingMarketLabel,
  joinMarketNames,
  shouldShowDelistingAnnouncement,
  writeDismissal,
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

describe("computeAffectedPositionMarkets", () => {
  const TON = "0x15c6eBD4175ffF9EE3c2615c556fCf62D2d9499c";
  const NON_DELISTING = "0x0000000000000000000000000000000000000002";

  it("intersects positions with the delisting list and counts entries", () => {
    const positionsInfoData = {
      k1: { marketAddress: TON },
      k2: { marketAddress: TON }, // e.g. long + short in the same market
      k3: { marketAddress: NON_DELISTING },
    } as any;
    const result = computeAffectedPositionMarkets(ARBITRUM, positionsInfoData);
    expect(result.marketAddresses).toEqual([TON]);
    expect(result.positionCount).toBe(2);
  });

  it("returns empty for undefined data", () => {
    expect(computeAffectedPositionMarkets(ARBITRUM, undefined)).toEqual({ marketAddresses: [], positionCount: 0 });
  });
});

describe("computeAffectedLiquidityMarkets", () => {
  const KTA = "0x970b730b5dD18de53A230eE8F4af088dBC3a6F8d";
  const NON_DELISTING = "0x0000000000000000000000000000000000000003";

  it("includes GM tokens with a positive balance that are delisting", () => {
    const data = { [KTA]: { symbol: "GM", balance: 5n } } as any;
    expect(computeAffectedLiquidityMarkets(ARBITRUM, data)).toEqual([KTA]);
  });

  it("excludes zero balances", () => {
    const data = { [KTA]: { symbol: "GM", balance: 0n } } as any;
    expect(computeAffectedLiquidityMarkets(ARBITRUM, data)).toEqual([]);
  });

  it("excludes GLV holdings (symbol !== 'GM')", () => {
    const data = { [KTA]: { symbol: "GLV", balance: 5n } } as any;
    expect(computeAffectedLiquidityMarkets(ARBITRUM, data)).toEqual([]);
  });

  it("excludes markets not in the delisting list", () => {
    const data = { [NON_DELISTING]: { symbol: "GM", balance: 5n } } as any;
    expect(computeAffectedLiquidityMarkets(ARBITRUM, data)).toEqual([]);
  });
});

describe("dismissal", () => {
  const ID = "delisting-positions";

  beforeEach(() => {
    localStorage.clear();
  });

  it("shows when there is no dismissal record", () => {
    expect(shouldShowDelistingAnnouncement(ID, ["0xA"], 1000)).toBe(true);
  });

  it("suppresses within the cooldown for the same set", () => {
    writeDismissal(ID, ["0xA"], 1000);
    expect(shouldShowDelistingAnnouncement(ID, ["0xA"], 1000 + 60_000)).toBe(false);
  });

  it("re-shows once the cooldown elapses", () => {
    writeDismissal(ID, ["0xA"], 1000);
    expect(shouldShowDelistingAnnouncement(ID, ["0xA"], 1000 + DELISTING_ANNOUNCEMENT_COOLDOWN_MS)).toBe(true);
  });

  it("re-shows immediately when a new market enters the set", () => {
    writeDismissal(ID, ["0xA"], 1000);
    expect(shouldShowDelistingAnnouncement(ID, ["0xA", "0xB"], 1000 + 60_000)).toBe(true);
  });

  it("ignores a corrupt record and shows", () => {
    localStorage.setItem("delisting-announcement-dismissed-delisting-positions", "not-json");
    expect(shouldShowDelistingAnnouncement(ID, ["0xA"], 1000)).toBe(true);
  });
});
