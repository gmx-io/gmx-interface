import { i18n } from "@lingui/core";
import { beforeEach, describe, expect, it } from "vitest";

import { ARBITRUM, AVALANCHE } from "config/chains";
import type { MarketInfo } from "domain/synthetics/markets/types";

import {
  DELISTING_ANNOUNCEMENT_COOLDOWN_MS,
  LIQUIDITY_TOAST_ID,
  POSITIONS_TOAST_ID,
  buildLiquidityBodyText,
  buildPositionsBodyText,
  computeAffectedLiquidityMarkets,
  computeAffectedPositionMarkets,
  getActiveDelistingAnnouncements,
  getDelistingMarketLabel,
  isMarketOpenOnchain,
  joinMarketNames,
  shouldShowDelistingAnnouncement,
  writeDismissal,
} from "./delistingExitAnnouncementsLogic";

i18n.load({ en: {} });
i18n.activate("en");

describe("joinMarketNames", () => {
  it("joins one name", () => expect(joinMarketNames(["BOME/USD"])).toBe("BOME/USD"));
  it("joins two names with 'and'", () =>
    expect(joinMarketNames(["BOME/USD", "SATS/USD"])).toBe("BOME/USD and SATS/USD"));
  it("joins three names with commas and 'and'", () =>
    expect(joinMarketNames(["A/USD", "B/USD", "C/USD"])).toBe("A/USD, B/USD, and C/USD"));
});

describe("getDelistingMarketLabel", () => {
  it("uses the index name for normal markets", () => {
    const marketInfo = { isSpotOnly: false, indexToken: { symbol: "BOME" } } as unknown as MarketInfo;
    expect(getDelistingMarketLabel(marketInfo)).toBe("BOME/USD");
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
    expect(buildPositionsBodyText(["BOME/USD"], 1)).toBe(
      "BOME/USD is being delisted. Close your existing position as remaining positions may be auto-closed."
    ));
  it("singular market with plural positions", () =>
    expect(buildPositionsBodyText(["BOME/USD"], 2)).toBe(
      "BOME/USD is being delisted. Close your existing positions as remaining positions may be auto-closed."
    ));
  it("plural markets and positions", () =>
    expect(buildPositionsBodyText(["BOME/USD", "SATS/USD"], 3)).toBe(
      "BOME/USD and SATS/USD are being delisted. Close your existing positions as remaining positions may be auto-closed."
    ));
  it("names no deadline", () => expect(buildPositionsBodyText(["BOME/USD"], 1)).not.toContain("August 5"));
});

describe("buildLiquidityBodyText", () => {
  it("singular pool", () =>
    expect(buildLiquidityBodyText(["BOME/USD"])).toBe(
      "BOME/USD is being delisted. Withdraw your liquidity as deposits are no longer available, or move it into GLV to keep earning."
    ));
  it("plural pools", () =>
    expect(buildLiquidityBodyText(["BOME/USD", "SATS/USD"])).toBe(
      "BOME/USD and SATS/USD are being delisted. Withdraw your liquidity as deposits are no longer available, or move it into GLV to keep earning."
    ));
  it("names no deadline", () => expect(buildLiquidityBodyText(["BOME/USD"])).not.toContain("August 5"));
});

const BOME = "0x71237F8C3d1484495A136022E16840b70fF84a69";
const SATS = "0x8ea4Fb801493DaD8724F90Fb2e279534fa591366";
const BRETT = "0x6EeE8098dBC106aEde99763FA5F955A5bBc42C50";
const ARBITRUM_MEME = "0x6CB901Cc64c024C3Fe4404c940FF9a3Acc229D2C";
const AVALANCHE_MELANIA = "0xe19da27Bf9733c429445E289B662bECDCa6ce10b";

// isSpotOnly:true keeps labels deterministic via getMarketPoolName.
const openMarket = (symbol: string) => ({
  isDisabled: false,
  isSpotOnly: true,
  longToken: { symbol },
  shortToken: { symbol: "USD" },
});
const closedMarket = (symbol: string) => ({ ...openMarket(symbol), isDisabled: true });

describe("isMarketOpenOnchain", () => {
  it("treats a market with isDisabled:false as open", () =>
    expect(isMarketOpenOnchain({ [BOME]: openMarket("BOME") } as any, BOME)).toBe(true));

  it("treats a market with isDisabled:true as closed", () =>
    expect(isMarketOpenOnchain({ [BRETT]: closedMarket("BRETT") } as any, BRETT)).toBe(false));

  // Guards the case where a market drops out of the data entirely rather than being flagged.
  it("treats a market missing from the data as closed", () =>
    expect(isMarketOpenOnchain({ [BOME]: openMarket("BOME") } as any, BRETT)).toBe(false));

  it("treats every market as closed while markets are still loading", () =>
    expect(isMarketOpenOnchain(undefined, BOME)).toBe(false));
});

describe("computeAffectedPositionMarkets", () => {
  const NON_DELISTING = "0x0000000000000000000000000000000000000002";
  const marketsInfoData = { [BOME]: openMarket("BOME"), [BRETT]: closedMarket("BRETT") } as any;

  it("intersects positions with the delisting list and counts entries", () => {
    const positionsInfoData = {
      k1: { marketAddress: BOME },
      k2: { marketAddress: BOME }, // e.g. long + short in the same market
      k3: { marketAddress: NON_DELISTING },
    } as any;
    const result = computeAffectedPositionMarkets(ARBITRUM, positionsInfoData, marketsInfoData);
    expect(result.marketAddresses).toEqual([BOME]);
    expect(result.positionCount).toBe(2);
  });

  it("excludes positions in markets that are disabled onchain, including their count", () => {
    const positionsInfoData = {
      k1: { marketAddress: BOME },
      k2: { marketAddress: BRETT },
    } as any;
    const result = computeAffectedPositionMarkets(ARBITRUM, positionsInfoData, marketsInfoData);
    expect(result.marketAddresses).toEqual([BOME]);
    expect(result.positionCount).toBe(1);
  });

  it("returns empty for undefined data", () => {
    expect(computeAffectedPositionMarkets(ARBITRUM, undefined, marketsInfoData)).toEqual({
      marketAddresses: [],
      positionCount: 0,
    });
  });
});

describe("computeAffectedLiquidityMarkets", () => {
  const NON_DELISTING = "0x0000000000000000000000000000000000000003";
  const marketsInfoData = { [SATS]: openMarket("SATS"), [BRETT]: closedMarket("BRETT") } as any;

  it("includes GM tokens with a positive balance that are delisting", () => {
    const data = { [SATS]: { symbol: "GM", balance: 5n } } as any;
    expect(computeAffectedLiquidityMarkets(ARBITRUM, data, marketsInfoData)).toEqual([SATS]);
  });

  it("excludes zero balances", () => {
    const data = { [SATS]: { symbol: "GM", balance: 0n } } as any;
    expect(computeAffectedLiquidityMarkets(ARBITRUM, data, marketsInfoData)).toEqual([]);
  });

  it("excludes markets not in the delisting list", () => {
    const data = { [NON_DELISTING]: { symbol: "GM", balance: 5n } } as any;
    expect(computeAffectedLiquidityMarkets(ARBITRUM, data, marketsInfoData)).toEqual([]);
  });

  it("excludes GM balances in markets that are disabled onchain", () => {
    const data = { [SATS]: { symbol: "GM", balance: 5n }, [BRETT]: { symbol: "GM", balance: 5n } } as any;
    expect(computeAffectedLiquidityMarkets(ARBITRUM, data, marketsInfoData)).toEqual([SATS]);
  });

  it("includes delisting pools on both Arbitrum and Avalanche while they are open", () => {
    expect(
      computeAffectedLiquidityMarkets(
        ARBITRUM,
        { [ARBITRUM_MEME]: { symbol: "GM", balance: 1n } } as any,
        { [ARBITRUM_MEME]: openMarket("USDC") } as any
      )
    ).toEqual([ARBITRUM_MEME]);
    expect(
      computeAffectedLiquidityMarkets(
        AVALANCHE,
        { [AVALANCHE_MELANIA]: { symbol: "GM", balance: 1n } } as any,
        { [AVALANCHE_MELANIA]: openMarket("USDC") } as any
      )
    ).toEqual([AVALANCHE_MELANIA]);
  });

  it("drops delisting pools on both chains once they are disabled onchain", () => {
    expect(
      computeAffectedLiquidityMarkets(
        ARBITRUM,
        { [ARBITRUM_MEME]: { symbol: "GM", balance: 1n } } as any,
        { [ARBITRUM_MEME]: closedMarket("USDC") } as any
      )
    ).toEqual([]);
    expect(
      computeAffectedLiquidityMarkets(
        AVALANCHE,
        { [AVALANCHE_MELANIA]: { symbol: "GM", balance: 1n } } as any,
        { [AVALANCHE_MELANIA]: closedMarket("USDC") } as any
      )
    ).toEqual([]);
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

describe("getActiveDelistingAnnouncements", () => {
  const marketsInfoData = {
    [BOME]: openMarket("BOME"),
    [SATS]: openMarket("SATS"),
    [BRETT]: closedMarket("BRETT"),
  } as any;

  beforeEach(() => {
    localStorage.clear();
  });

  it("shows only the positions toast when the user has a delisting position", () => {
    const result = getActiveDelistingAnnouncements({
      chainId: ARBITRUM,
      positionsInfoData: { k: { marketAddress: BOME } } as any,
      depositMarketTokensData: undefined,
      marketsInfoData,
      now: 1000,
    });
    expect(result.map((item) => item.id)).toEqual([POSITIONS_TOAST_ID]);
    expect(result[0].markets).toEqual([BOME]);
    expect(result[0].title).toBe("Market delistings");
    expect(result[0].link).toEqual({ text: "Close positions", href: "/trade" });
  });

  it("shows only the liquidity toast (with the Manage liquidity link) for direct GM holders", () => {
    const result = getActiveDelistingAnnouncements({
      chainId: ARBITRUM,
      positionsInfoData: undefined,
      depositMarketTokensData: { [SATS]: { symbol: "GM", balance: 1n } } as any,
      marketsInfoData,
      now: 1000,
    });
    expect(result.map((item) => item.id)).toEqual([LIQUIDITY_TOAST_ID]);
    expect(result[0].link).toEqual({ text: "Manage liquidity", href: "/pools" });
  });

  it("shows nothing when there is no exposure", () => {
    const result = getActiveDelistingAnnouncements({
      chainId: ARBITRUM,
      positionsInfoData: undefined,
      depositMarketTokensData: undefined,
      marketsInfoData,
      now: 1000,
    });
    expect(result).toEqual([]);
  });

  it("shows nothing when the only exposure is in markets closed onchain", () => {
    const result = getActiveDelistingAnnouncements({
      chainId: ARBITRUM,
      positionsInfoData: { k: { marketAddress: BRETT } } as any,
      depositMarketTokensData: { [BRETT]: { symbol: "GM", balance: 1n } } as any,
      marketsInfoData,
      now: 1000,
    });
    expect(result).toEqual([]);
  });

  it("names only the markets that are still open when exposure spans both", () => {
    const result = getActiveDelistingAnnouncements({
      chainId: ARBITRUM,
      positionsInfoData: { k1: { marketAddress: BOME }, k2: { marketAddress: BRETT } } as any,
      depositMarketTokensData: undefined,
      marketsInfoData,
      now: 1000,
    });
    expect(result[0].markets).toEqual([BOME]);
    expect(result[0].bodyText).toContain("BOME-USD");
    expect(result[0].bodyText).not.toContain("BRETT");
  });

  it("does not re-show a dismissed toast within the cooldown", () => {
    writeDismissal(POSITIONS_TOAST_ID, [BOME], 1000);
    const result = getActiveDelistingAnnouncements({
      chainId: ARBITRUM,
      positionsInfoData: { k: { marketAddress: BOME } } as any,
      depositMarketTokensData: undefined,
      marketsInfoData,
      now: 2000,
    });
    expect(result).toEqual([]);
  });

  it("waits when marketsInfoData has not loaded", () => {
    const result = getActiveDelistingAnnouncements({
      chainId: ARBITRUM,
      positionsInfoData: { k: { marketAddress: BOME } } as any,
      depositMarketTokensData: undefined,
      marketsInfoData: undefined,
      now: 1000,
    });
    expect(result).toEqual([]);
  });
});
