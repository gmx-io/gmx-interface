import { i18n } from "@lingui/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import * as staticMarkets from "config/static/markets";
import type { MarketInfo, MarketsInfoData } from "domain/synthetics/markets/types";
import { OrderType, type OrdersInfoData } from "domain/synthetics/orders/types";
import type { PositionsData } from "domain/synthetics/positions/types";
import { expandDecimals } from "lib/numbers";

import { ClosingNoticeSeenStages, getClosingMarketsExposure, getClosingPoolsNotices } from "./closingPoolsNotices";

i18n.load({ en: {} });
i18n.activate("en");

const NEAR = "0x63Dc80EE90F26363B3FCD609007CC9e14c8991BE";
const XRP = "0x0CCB4fAa6f1F1B30911619f1184082aB4E25813c";
const ZEC = "0x587759c237acCa739bCE3911647BacF56C876E60";
const HYPE = "0xBcb8FE13d02b023e8f94f6881Cc0192fd918A5C0";
const ETH = "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336";

const CLOSING_DATES: Record<string, number> = {
  [NEAR]: Date.UTC(2026, 10, 2),
  [XRP]: Date.UTC(2026, 10, 2),
  [ZEC]: Date.UTC(2026, 10, 2),
  [HYPE]: Date.UTC(2026, 10, 2),
};

const marketsInfoData = Object.fromEntries(
  [
    [NEAR, "NEAR"],
    [XRP, "XRP"],
    [ZEC, "ZEC"],
    [HYPE, "HYPE"],
    [ETH, "ETH"],
  ].map(([address, symbol]) => [
    address,
    {
      marketTokenAddress: address,
      indexToken: { symbol },
      isSpotOnly: false,
      isDisabled: false,
    } as unknown as MarketInfo,
  ])
) as MarketsInfoData;

const usd = (value: number) => expandDecimals(value, 30);

function positions(...items: [market: string, sizeUsd: number][]): PositionsData {
  return Object.fromEntries(
    items.map(([marketAddress, sizeUsd], i) => [`p${i}`, { marketAddress, sizeInUsd: usd(sizeUsd) }])
  ) as unknown as PositionsData;
}

function orders(...items: [market: string, orderType: OrderType, sizeUsd: number][]): OrdersInfoData {
  return Object.fromEntries(
    items.map(([marketAddress, orderType, sizeUsd], i) => [
      `o${i}`,
      { key: `o${i}`, marketAddress, orderType, sizeDeltaUsd: usd(sizeUsd) },
    ])
  ) as unknown as OrdersInfoData;
}

function noticesAt(now: number, p: PositionsData, o: OrdersInfoData, seen: ClosingNoticeSeenStages = {}) {
  const exposures = getClosingMarketsExposure({
    chainId: ARBITRUM,
    positionsData: p,
    ordersInfoData: o,
    marketsInfoData,
    now,
  });

  return getClosingPoolsNotices(exposures, seen);
}

beforeEach(() => {
  vi.spyOn(staticMarkets, "getMarketClosingDate").mockImplementation((chainId, address) =>
    chainId === ARBITRUM ? CLOSING_DATES[address] : undefined
  );
  vi.spyOn(staticMarkets, "isDelistingMarket").mockReturnValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("closing pools notice", () => {
  it("tells a wallet once, then reminds it on the last day and after the cut-off only while its orders remain", () => {
    const p = positions([NEAR, 12_400], [XRP, 3_000]);
    const withOrders = orders(
      [NEAR, OrderType.LimitIncrease, 5_000],
      [NEAR, OrderType.StopIncrease, 3_000],
      [XRP, OrderType.LimitIncrease, 1_000]
    );
    const steps: [now: number, o: OrdersInfoData, expected: Record<string, unknown>[]][] = [
      [
        Date.UTC(2026, 9, 27),
        withOrders,
        [
          {
            title: "NEAR and XRP trading is moving to USDG pools",
            bodyText:
              "The new USDG pools have more room. Your current positions stay open: hold, add margin, reduce or close any time. Adding size is limited now and stops on Nov\u00a02.",
            ordersLeadText: "3 pending orders won't fill after Nov\u00a02.",
            ordersActionText: "Cancel and re-place them in the USDG pools.",
          },
        ],
      ],
      [Date.UTC(2026, 9, 31, 23), withOrders, []],
      [
        Date.UTC(2026, 10, 1, 12),
        withOrders,
        [{ title: "NEAR and XRP trading is moving to USDG pools", bodyText: undefined, ordersCount: 3 }],
      ],
      [Date.UTC(2026, 10, 1, 18), withOrders, []],
      [
        Date.UTC(2026, 10, 3),
        orders([XRP, OrderType.LimitIncrease, 1_000]),
        [
          {
            title: "XRP trading has moved to USDG pools",
            bodyText: undefined,
            ordersLeadText: "1 pending order can't fill.",
            ordersActionText: "Cancel and re-place it in the USDG pools.",
          },
        ],
      ],
      [Date.UTC(2026, 10, 4), orders([XRP, OrderType.LimitIncrease, 1_000]), []],
    ];

    let seen: ClosingNoticeSeenStages = {};

    for (const [now, o, expected] of steps) {
      const notices = noticesAt(now, p, o, seen);

      expect(notices).toMatchObject(expected);

      for (const notice of notices) {
        seen = { ...seen, ...notice.seenStages };
      }
    }
  });

  it("shows a closed pool and a closing pool as two notices, each closed on its own", () => {
    vi.spyOn(staticMarkets, "getMarketClosingDate").mockImplementation((_, address) =>
      address === XRP ? Date.UTC(2026, 10, 9) : CLOSING_DATES[address]
    );

    const p = positions([NEAR, 2_000], [XRP, 1_000]);
    const o = orders([NEAR, OrderType.LimitIncrease, 500]);
    const notices = noticesAt(Date.UTC(2026, 10, 3), p, o);

    expect(notices).toMatchObject([
      { title: "NEAR trading has moved to USDG pools", ordersLeadText: "1 pending order can't fill." },
      {
        title: "XRP trading is moving to USDG pools",
        bodyText:
          "The new USDG pools have more room. Your current positions stay open: hold, add margin, reduce or close any time. Adding size is limited now and stops on Nov\u00a09.",
        ordersCount: 0,
      },
    ]);
    expect(noticesAt(Date.UTC(2026, 10, 3), p, o, notices[0].seenStages)).toMatchObject([
      { title: "XRP trading is moving to USDG pools" },
    ]);
    expect(noticesAt(Date.UTC(2026, 10, 3), p, o, notices[1].seenStages)).toMatchObject([
      { title: "NEAR trading has moved to USDG pools" },
    ]);
  });

  it.each([
    ["nobody outside closing pools", Date.UTC(2026, 9, 27), positions([ETH, 5_000]), orders(), []],
    [
      "not for take-profits, stop-losses or margin deposits",
      Date.UTC(2026, 9, 27),
      positions(),
      orders(
        [NEAR, OrderType.LimitDecrease, 1_000],
        [NEAR, OrderType.StopLossDecrease, 1_000],
        [NEAR, OrderType.LimitIncrease, 0]
      ),
      [],
    ],
    [
      "the has-moved version to a wallet first seen after the cut-off",
      Date.UTC(2026, 10, 3),
      positions([HYPE, 2_000]),
      orders(),
      [
        {
          title: "HYPE trading has moved to USDG pools",
          bodyText:
            "Your current positions stay open: hold, add margin, reduce or close any time. New positions open in the USDG pools.",
          ordersCount: 0,
        },
      ],
    ],
    [
      "up to three markets in full, by exposure",
      Date.UTC(2026, 9, 27),
      positions([NEAR, 100], [XRP, 4_000], [ZEC, 3_000]),
      orders(),
      [{ title: "XRP, ZEC and NEAR trading is moving to USDG pools" }],
    ],
    [
      "the first two markets by exposure and a count of the rest from four markets",
      Date.UTC(2026, 9, 27),
      positions([NEAR, 100], [XRP, 4_000], [ZEC, 3_000], [HYPE, 200]),
      orders(),
      [{ title: "XRP, ZEC +2 more trading is moving to USDG pools" }],
    ],
  ])("shows %s", (_, now, p, o, expected) => {
    expect(noticesAt(now, p, o)).toMatchObject(expected);
  });

  it("never names a delisting market", () => {
    vi.spyOn(staticMarkets, "isDelistingMarket").mockImplementation((_, address) => address === NEAR);

    expect(noticesAt(Date.UTC(2026, 9, 27), positions([NEAR, 1_000]), orders())).toEqual([]);
  });
});
