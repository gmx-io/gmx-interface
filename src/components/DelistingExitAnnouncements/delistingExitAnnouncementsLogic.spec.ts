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
      "TON/USD will be disabled after August 5, 2026, 23:59 UTC. Close your position before then. Collateral left in open positions won't be accessible after that."
    ));
  it("singular market with plural positions", () =>
    expect(buildPositionsBodyText(["TON/USD"], 2)).toBe(
      "TON/USD will be disabled after August 5, 2026, 23:59 UTC. Close your positions before then. Collateral left in open positions won't be accessible after that."
    ));
  it("plural markets and positions", () =>
    expect(buildPositionsBodyText(["TON/USD", "PI/USD"], 3)).toBe(
      "TON/USD and PI/USD will be disabled after August 5, 2026, 23:59 UTC. Close your positions before then. Collateral left in open positions won't be accessible after that."
    ));
});

describe("buildLiquidityBodyText", () => {
  it("singular pool", () =>
    expect(buildLiquidityBodyText(["KTA/USD"])).toBe(
      "KTA/USD will be disabled after August 5, 2026, 23:59 UTC. Withdraw your liquidity before then. GM tokens left in a disabled pool won't be accessible after that."
    ));
  it("plural pools", () =>
    expect(buildLiquidityBodyText(["KTA/USD", "SATS/USD"])).toBe(
      "KTA/USD and SATS/USD will be disabled after August 5, 2026, 23:59 UTC. Withdraw your liquidity before then. GM tokens left in a disabled pool won't be accessible after that."
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
  const ARBITRUM_DAI_SWAP = "0xe2fEDb9e6139a182B98e7C2688ccFa3e9A53c665";
  const AVALANCHE_DAI_SWAP = "0xDf8c9BD26e7C1A331902758Eb013548B2D22ab3b";
  const NON_DELISTING = "0x0000000000000000000000000000000000000003";

  it("includes GM tokens with a positive balance that are delisting", () => {
    const data = { [KTA]: { symbol: "GM", balance: 5n } } as any;
    expect(computeAffectedLiquidityMarkets(ARBITRUM, data)).toEqual([KTA]);
  });

  it("excludes zero balances", () => {
    const data = { [KTA]: { symbol: "GM", balance: 0n } } as any;
    expect(computeAffectedLiquidityMarkets(ARBITRUM, data)).toEqual([]);
  });

  it("excludes markets not in the delisting list", () => {
    const data = { [NON_DELISTING]: { symbol: "GM", balance: 5n } } as any;
    expect(computeAffectedLiquidityMarkets(ARBITRUM, data)).toEqual([]);
  });

  it("includes the DAI swap pools on Arbitrum and Avalanche", () => {
    expect(
      computeAffectedLiquidityMarkets(ARBITRUM, { [ARBITRUM_DAI_SWAP]: { symbol: "GM", balance: 1n } } as any)
    ).toEqual([ARBITRUM_DAI_SWAP]);
    expect(
      computeAffectedLiquidityMarkets(AVALANCHE, { [AVALANCHE_DAI_SWAP]: { symbol: "GM", balance: 1n } } as any)
    ).toEqual([AVALANCHE_DAI_SWAP]);
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
  const TON = "0x15c6eBD4175ffF9EE3c2615c556fCf62D2d9499c";
  const KTA = "0x970b730b5dD18de53A230eE8F4af088dBC3a6F8d";

  // Minimal marketInfo objects; isSpotOnly:true keeps labels deterministic via getMarketPoolName.
  const marketsInfoData = {
    [TON]: { isSpotOnly: true, longToken: { symbol: "TON" }, shortToken: { symbol: "USD" } },
    [KTA]: { isSpotOnly: true, longToken: { symbol: "KTA" }, shortToken: { symbol: "USD" } },
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
    expect(result[0].title).toBe("Final notice: market delistings");
    expect(result[0].link).toBeUndefined();
  });

  it("shows only the liquidity toast (with the Withdraw liquidity link) for direct GM holders", () => {
    const result = getActiveDelistingAnnouncements({
      chainId: ARBITRUM,
      positionsInfoData: undefined,
      depositMarketTokensData: { [KTA]: { symbol: "GM", balance: 1n } } as any,
      marketsInfoData,
      now: 1000,
    });
    expect(result.map((item) => item.id)).toEqual([LIQUIDITY_TOAST_ID]);
    expect(result[0].link).toEqual({ text: "Withdraw liquidity", href: "/pools" });
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

  it("ignores the earlier warning's dismissal record", () => {
    localStorage.setItem(
      "delisting-announcement-dismissed-delisting-positions",
      JSON.stringify({ dismissedAt: 1000, markets: [TON] })
    );

    const result = getActiveDelistingAnnouncements({
      chainId: ARBITRUM,
      positionsInfoData: { k: { marketAddress: TON } } as any,
      depositMarketTokensData: undefined,
      marketsInfoData,
      now: 2000,
    });

    expect(result.map((item) => item.id)).toEqual([POSITIONS_TOAST_ID]);
  });

  it("waits when marketsInfoData has not loaded (cannot label)", () => {
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
