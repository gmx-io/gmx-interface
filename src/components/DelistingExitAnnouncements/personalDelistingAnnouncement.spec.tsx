import { i18n } from "@lingui/core";
import { beforeAll, describe, expect, it } from "vitest";

import { reactNodeToText } from "pages/Announcements/announcementsHelpers";

import type { DelistingExposure } from "./delistingExitAnnouncementsLogic";
import { getPersonalDelistingAnnouncement } from "./personalDelistingAnnouncement";

beforeAll(() => {
  i18n.load({ en: {} });
  i18n.activate("en");
});

function makeExposure(overrides: Partial<DelistingExposure> = {}): DelistingExposure {
  return {
    positionMarkets: [],
    positionNames: [],
    positionCount: 0,
    liquidityMarkets: [],
    liquidityNames: [],
    ...overrides,
  };
}

describe("getPersonalDelistingAnnouncement", () => {
  const account = "0x104d73283Ae1B380710659d3411C3C89603F80fF";

  it("returns nothing without a connected wallet", () => {
    const exposure = makeExposure({ positionNames: ["TON/USD"], positionCount: 1 });
    expect(getPersonalDelistingAnnouncement(undefined, 42161, exposure)).toBeUndefined();
  });

  it("returns nothing when the wallet has no affected exposure", () => {
    expect(getPersonalDelistingAnnouncement(account, 42161, makeExposure())).toBeUndefined();
  });

  it("includes only the applicable position line and action", () => {
    const event = getPersonalDelistingAnnouncement(
      account,
      42161,
      makeExposure({
        positionMarkets: ["0x1", "0x2"],
        positionNames: ["TON/USD", "PI/USD"],
        positionCount: 2,
      })
    );

    expect(event?.title).toBe("Final notice: market delistings");
    expect(event?.type).toBe("delisting");
    expect(event?.chains).toEqual([42161]);
    expect(event?.links).toEqual([{ text: "Close positions", href: "/trade" }]);

    const body = reactNodeToText(event?.description).replace(/\s+/g, " ");
    expect(body).toContain(`Your wallet ${account} still holds capital`);
    expect(body).toContain("Positions to close: TON/USD, PI/USD");
    expect(body).not.toContain("Liquidity to withdraw:");
    expect(body).toContain("capital left in them won't be accessible from the app");
  });

  it("includes only the applicable liquidity line and action", () => {
    const event = getPersonalDelistingAnnouncement(
      account,
      42161,
      makeExposure({
        liquidityMarkets: ["0x1"],
        liquidityNames: ["USDC-DAI"],
      })
    );

    expect(event?.links).toEqual([{ text: "Withdraw liquidity", href: "/pools" }]);

    const body = reactNodeToText(event?.description).replace(/\s+/g, " ");
    expect(body).not.toContain("Positions to close:");
    expect(body).toContain("Liquidity to withdraw: USDC-DAI");
  });

  it("includes both applicable lines and actions", () => {
    const event = getPersonalDelistingAnnouncement(
      account,
      43114,
      makeExposure({
        positionMarkets: ["0x1"],
        positionNames: ["BTC/USD"],
        positionCount: 1,
        liquidityMarkets: ["0x2"],
        liquidityNames: ["USDC-DAI.e"],
      })
    );

    expect(event?.links).toEqual([
      { text: "Close positions", href: "/trade" },
      { text: "Withdraw liquidity", href: "/pools" },
    ]);

    const body = reactNodeToText(event?.description).replace(/\s+/g, " ");
    expect(body).toContain("Positions to close: BTC/USD");
    expect(body).toContain("Liquidity to withdraw: USDC-DAI.e");
  });
});
