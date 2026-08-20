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
  it("joins one name", () => expect(joinMarketNames(["TON/USD"])).toBe("TON/USD"));
  it("joins two names with 'and'", () => expect(joinMarketNames(["TON/USD", "PI/USD"])).toBe("TON/USD and PI/USD"));
  it("joins three names with commas and 'and'", () =>
    expect(joinMarketNames(["A/USD", "B/USD", "C/USD"])).toBe("A/USD, B/USD, and C/USD"));
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
  it("singular market with plural positions", () =>
    expect(buildPositionsBodyText(["TON/USD"], 2)).toBe(
      "TON/USD is being delisted. Close your existing positions as remaining positions may be auto-closed."
    ));
  it("plural markets and positions", () =>
    expect(buildPositionsBodyText(["TON/USD", "PI/USD"], 3)).toBe(
      "TON/USD and PI/USD are being delisted. Close your existing positions as remaining positions may be auto-closed."
    ));
  it("names no deadline", () => expect(buildPositionsBodyText(["TON/USD"], 1)).not.toContain("August 5"));
});

describe("buildLiquidityBodyText", () => {
  it("singular pool", () =>
    expect(buildLiquidityBodyText(["KTA/USD"])).toBe(
      "KTA/USD is being delisted. Withdraw your liquidity as deposits are no longer available, or move it into GLV to keep earning."
    ));
  it("plural pools", () =>
    expect(buildLiquidityBodyText(["KTA/USD", "MKR/USD"])).toBe(
      "KTA/USD and MKR/USD are being delisted. Withdraw your liquidity as deposits are no longer available, or move it into GLV to keep earning."
    ));
  it("names no deadline", () => expect(buildLiquidityBodyText(["KTA/USD"])).not.toContain("August 5"));
});

const TON = "0x15c6eBD4175ffF9EE3c2615c556fCf62D2d9499c";
const KTA = "0x970b730b5dD18de53A230eE8F4af088dBC3a6F8d";
const AI16Z = "0xD60f1BA6a76979eFfE706BF090372Ebc0A5bF169";
const ARBITRUM_DAI_SWAP = "0xe2fEDb9e6139a182B98e7C2688ccFa3e9A53c665";
const AVALANCHE_DAI_SWAP = "0xDf8c9BD26e7C1A331902758Eb013548B2D22ab3b";

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
    expect(isMarketOpenOnchain({ [TON]: openMarket("TON") } as any, TON)).toBe(true));

  it("treats a market with isDisabled:true as closed", () =>
    expect(isMarketOpenOnchain({ [AI16Z]: closedMarket("AI16Z") } as any, AI16Z)).toBe(false));

  // Guards the case where a market drops out of the data entirely rather than being flagged.
  it("treats a market missing from the data as closed", () =>
    expect(isMarketOpenOnchain({ [TON]: openMarket("TON") } as any, AI16Z)).toBe(false));

  it("treats every market as closed while markets are still loading", () =>
    expect(isMarketOpenOnchain(undefined, TON)).toBe(false));
});

describe("computeAffectedPositionMarkets", () => {
  const NON_DELISTING = "0x0000000000000000000000000000000000000002";
  const marketsInfoData = { [TON]: openMarket("TON"), [AI16Z]: closedMarket("AI16Z") } as any;

  it("intersects positions with the delisting list and counts entries", () => {
    const positionsInfoData = {
      k1: { marketAddress: TON },
      k2: { marketAddress: TON }, // e.g. long + short in the same market
      k3: { marketAddress: NON_DELISTING },
    } as any;
    const result = computeAffectedPositionMarkets(ARBITRUM, positionsInfoData, marketsInfoData);
    expect(result.marketAddresses).toEqual([TON]);
    expect(result.positionCount).toBe(2);
  });

  it("excludes positions in markets that are disabled onchain, including their count", () => {
    const positionsInfoData = {
      k1: { marketAddress: TON },
      k2: { marketAddress: AI16Z },
    } as any;
    const result = computeAffectedPositionMarkets(ARBITRUM, positionsInfoData, marketsInfoData);
    expect(result.marketAddresses).toEqual([TON]);
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
  const marketsInfoData = { [KTA]: openMarket("KTA"), [AI16Z]: closedMarket("AI16Z") } as any;

  it("includes GM tokens with a positive balance that are delisting", () => {
    const data = { [KTA]: { symbol: "GM", balance: 5n } } as any;
    expect(computeAffectedLiquidityMarkets(ARBITRUM, data, marketsInfoData)).toEqual([KTA]);
  });

  it("excludes zero balances", () => {
    const data = { [KTA]: { symbol: "GM", balance: 0n } } as any;
    expect(computeAffectedLiquidityMarkets(ARBITRUM, data, marketsInfoData)).toEqual([]);
  });

  it("excludes markets not in the delisting list", () => {
    const data = { [NON_DELISTING]: { symbol: "GM", balance: 5n } } as any;
    expect(computeAffectedLiquidityMarkets(ARBITRUM, data, marketsInfoData)).toEqual([]);
  });

  it("excludes GM balances in markets that are disabled onchain", () => {
    const data = { [KTA]: { symbol: "GM", balance: 5n }, [AI16Z]: { symbol: "GM", balance: 5n } } as any;
    expect(computeAffectedLiquidityMarkets(ARBITRUM, data, marketsInfoData)).toEqual([KTA]);
  });

  it("includes the DAI swap pools on Arbitrum and Avalanche while they are open", () => {
    expect(
      computeAffectedLiquidityMarkets(
        ARBITRUM,
        { [ARBITRUM_DAI_SWAP]: { symbol: "GM", balance: 1n } } as any,
        { [ARBITRUM_DAI_SWAP]: openMarket("USDC") } as any
      )
    ).toEqual([ARBITRUM_DAI_SWAP]);
    expect(
      computeAffectedLiquidityMarkets(
        AVALANCHE,
        { [AVALANCHE_DAI_SWAP]: { symbol: "GM", balance: 1n } } as any,
        { [AVALANCHE_DAI_SWAP]: openMarket("USDC") } as any
      )
    ).toEqual([AVALANCHE_DAI_SWAP]);
  });

  it("drops the DAI swap pools once they are disabled onchain", () => {
    expect(
      computeAffectedLiquidityMarkets(
        ARBITRUM,
        { [ARBITRUM_DAI_SWAP]: { symbol: "GM", balance: 1n } } as any,
        { [ARBITRUM_DAI_SWAP]: closedMarket("USDC") } as any
      )
    ).toEqual([]);
    expect(
      computeAffectedLiquidityMarkets(
        AVALANCHE,
        { [AVALANCHE_DAI_SWAP]: { symbol: "GM", balance: 1n } } as any,
        { [AVALANCHE_DAI_SWAP]: closedMarket("USDC") } as any
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
    [TON]: openMarket("TON"),
    [KTA]: openMarket("KTA"),
    [AI16Z]: closedMarket("AI16Z"),
  } as any;

  beforeEach(() => {
    localStorage.clear();
  });

  it("shows only the positions toast when the user has a delisting position", () => {
    const result = getActiveDelistingAnnouncements({
      chainId: ARBITRUM,
      positionsInfoData: { k: { marketAddress: TON } } as any,
      depositMarketTokensData: undefined,
      marketsInfoData,
      now: 1000,
    });
    expect(result.map((item) => item.id)).toEqual([POSITIONS_TOAST_ID]);
    expect(result[0].markets).toEqual([TON]);
    expect(result[0].title).toBe("Market delistings");
    expect(result[0].link).toEqual({ text: "Close positions", href: "/trade" });
  });

  it("shows only the liquidity toast (with the Manage liquidity link) for direct GM holders", () => {
    const result = getActiveDelistingAnnouncements({
      chainId: ARBITRUM,
      positionsInfoData: undefined,
      depositMarketTokensData: { [KTA]: { symbol: "GM", balance: 1n } } as any,
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
      positionsInfoData: { k: { marketAddress: AI16Z } } as any,
      depositMarketTokensData: { [AI16Z]: { symbol: "GM", balance: 1n } } as any,
      marketsInfoData,
      now: 1000,
    });
    expect(result).toEqual([]);
  });

  it("names only the markets that are still open when exposure spans both", () => {
    const result = getActiveDelistingAnnouncements({
      chainId: ARBITRUM,
      positionsInfoData: { k1: { marketAddress: TON }, k2: { marketAddress: AI16Z } } as any,
      depositMarketTokensData: undefined,
      marketsInfoData,
      now: 1000,
    });
    expect(result[0].markets).toEqual([TON]);
    expect(result[0].bodyText).toContain("TON-USD");
    expect(result[0].bodyText).not.toContain("AI16Z");
  });

  it("does not re-show a dismissed toast within the cooldown", () => {
    writeDismissal(POSITIONS_TOAST_ID, [TON], 1000);
    const result = getActiveDelistingAnnouncements({
      chainId: ARBITRUM,
      positionsInfoData: { k: { marketAddress: TON } } as any,
      depositMarketTokensData: undefined,
      marketsInfoData,
      now: 2000,
    });
    expect(result).toEqual([]);
  });

  it("waits when marketsInfoData has not loaded", () => {
    const result = getActiveDelistingAnnouncements({
      chainId: ARBITRUM,
      positionsInfoData: { k: { marketAddress: TON } } as any,
      depositMarketTokensData: undefined,
      marketsInfoData: undefined,
      now: 1000,
    });
    expect(result).toEqual([]);
  });
});
