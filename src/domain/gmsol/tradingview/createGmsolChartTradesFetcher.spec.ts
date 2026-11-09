import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { GMSOL_STORE_ADDRESS } from "config/gmsol/program";
import { GmxApiSdk } from "sdk/clients/v2";
import { mergeMarketsConfigValues } from "sdk/utils/markets";
import type { MarketsInfoData } from "sdk/utils/markets/types";
import type { PositionInfo } from "sdk/utils/positions/types";

import { createGmsolChartTradesFetcher } from "./createGmsolChartTradesFetcher";
import fixturePrices from "../api/__fixtures__/prices.json";
import { createGmsolFixtureHttp } from "../api/createGmsolFixtureHttp";
import { composeGmsolMarkets } from "../markets/composeGmsolMarkets";
import { composeGmsolPositionsInfo } from "../positions/composeGmsolPositionsInfo";
import { buildGmsolTokensData } from "../tokens/buildGmsolTokensData";

const OWNER = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";
const BTC_MARKET = "7RNev94wKusSmFEqo3gvv1d1zMweP6sa2LtjJjroAvym";
const POSITION = "PositionAccount";
const FROM = Date.parse("2026-11-01T00:00:00Z") / 1000;
const TO = FROM + 3600;
let markets: MarketsInfoData;
let position: PositionInfo;

beforeAll(async () => {
  const sdk = new GmxApiSdk({ chainId: ARBITRUM, api: createGmsolFixtureHttp() });
  const [config, values, positions] = await Promise.all([
    sdk.fetchMarketsConfig(),
    sdk.fetchMarketsValues(),
    sdk.fetchPositionsInfo({ address: OWNER }),
  ]);
  const tokens = buildGmsolTokensData(
    Object.fromEntries(
      Object.entries(fixturePrices).map(([address, p]) => [
        address,
        { minPrice: BigInt(p.minPrice), maxPrice: BigInt(p.maxPrice) },
      ])
    )
  );
  const composed = composeGmsolMarkets(mergeMarketsConfigValues(config, values), tokens);
  markets = { [BTC_MARKET]: composed.marketsInfoData[BTC_MARKET] };
  const [sample] = Object.values(composeGmsolPositionsInfo(positions, markets, { showPnlInLeverage: false }));
  position = { ...sample, contractKey: POSITION, isLong: true, increasedAtTime: BigInt(FROM + 300) };
});

afterEach(() => vi.restoreAllMocks());

function event(id = "002", overrides = {}) {
  return {
    id,
    timestamp: new Date((FROM + 120) * 1000).toISOString(),
    position: POSITION,
    marketToken: BTC_MARKET,
    flags: "5",
    executionPrice: "70000000000000000", // $70,000 ×10^20 / 10^8 satoshis
    beforeSizeInUsd: "0",
    afterSizeInUsd: "100000000000000000000000",
    ...overrides,
  };
}

function params(mode: "all" | "current" = "all") {
  return { account: OWNER, markets, positions: { [position.key]: position }, mode, from: FROM, to: TO };
}

describe("Solana chart trades", () => {
  it.each([
    ["5", true, true],
    ["4", false, true],
    ["1", true, false],
    ["0", false, false],
  ])("decodes flags %s and converts BTC execution prices to chart units", async (flags, isLong, isIncrease) => {
    const postJson = vi.fn().mockResolvedValue({ data: { tradeEvents: [event("002", { flags })] } });
    const trades = await createGmsolChartTradesFetcher({ postJson })(params());
    expect(trades).toEqual([
      {
        id: "002",
        ts: FROM + 120,
        marketAddress: BTC_MARKET,
        isLong,
        isIncrease,
        executionPrice: 70_000n * 10n ** 30n,
      },
    ]);
    expect(postJson.mock.calls[0][1].variables).toEqual({
      owner: OWNER,
      store: GMSOL_STORE_ADDRESS,
      markets: [BTC_MARKET],
      from: new Date(FROM * 1000).toISOString(),
      to: new Date(TO * 1000).toISOString(),
      cursor: undefined,
    });
  });

  it("omits collateral-only actions, other markets and events outside the visible range", async () => {
    const postJson = vi.fn().mockResolvedValue({
      data: {
        tradeEvents: [
          event("001", { beforeSizeInUsd: "1", afterSizeInUsd: "1" }),
          event("002", { marketToken: BTC_MARKET.toLowerCase() }),
          event("003", { timestamp: new Date((FROM - 1) * 1000).toISOString() }),
          event("004", { timestamp: new Date((TO + 1) * 1000).toISOString() }),
          event("005"),
        ],
      },
    });
    expect((await createGmsolChartTradesFetcher({ postJson })(params())).map((trade) => trade.id)).toEqual(["005"]);
  });

  it("keeps earlier fills in the current lifecycle and excludes a previous lifecycle of the same account", async () => {
    const opening = event("003");
    const postJson = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          opening: [opening],
          latest: [event("005", { timestamp: new Date((FROM + 300) * 1000).toISOString() })],
        },
      })
      .mockResolvedValueOnce({
        data: {
          tradeEvents: [
            event("005", { timestamp: new Date((FROM + 300) * 1000).toISOString() }),
            event("004", { beforeSizeInUsd: "100", afterSizeInUsd: "50", flags: "1" }),
            opening,
            event("002", { afterSizeInUsd: "0", beforeSizeInUsd: "100", flags: "1" }),
            event("001"),
            event("006", { position: "OtherPosition" }),
            event("007", { flags: "4" }),
          ],
        },
      });
    const trades = await createGmsolChartTradesFetcher({ postJson })(params("current"));
    expect(trades.map((trade) => trade.id)).toEqual(["003", "004", "005"]);
    expect(postJson.mock.calls[0][1].variables).toEqual({
      owner: OWNER,
      store: GMSOL_STORE_ADDRESS,
      position: POSITION,
    });
  });

  it("does not reuse a closed indexed lifecycle while a reopened position is still being indexed", async () => {
    const postJson = vi.fn().mockResolvedValue({
      data: { opening: [event()], latest: [event("003", { afterSizeInUsd: "0" })] },
    });
    expect(await createGmsolChartTradesFetcher({ postJson })(params("current"))).toEqual([]);
    expect(postJson).toHaveBeenCalledTimes(1);
  });

  it("does not request current-position history without an active position for the connected wallet", async () => {
    const postJson = vi.fn();
    const fetcher = createGmsolChartTradesFetcher({ postJson });
    expect(await fetcher({ ...params("current"), positions: undefined })).toEqual([]);
    expect(await fetcher({ ...params("current"), account: OWNER.toLowerCase() })).toEqual([]);
    expect(postJson).not.toHaveBeenCalled();
  });

  it("waits for the indexer to reach the current RPC position update before showing its lifecycle", async () => {
    const postJson = vi.fn().mockResolvedValue({ data: { opening: [event()], latest: [event("003")] } });
    expect(await createGmsolChartTradesFetcher({ postJson })(params("current"))).toEqual([]);
    expect(postJson).toHaveBeenCalledTimes(1);
  });

  it("paginates beyond 100 fills with a stable cursor and returns chronological trades", async () => {
    const page = Array.from({ length: 100 }, (_, i) => event(String(200 - i).padStart(3, "0")));
    const postJson = vi
      .fn()
      .mockResolvedValueOnce({ data: { tradeEvents: page } })
      .mockResolvedValueOnce({ data: { tradeEvents: [event("100")] } });
    const trades = await createGmsolChartTradesFetcher({ postJson })(params());
    expect(trades).toHaveLength(101);
    expect(trades[0].id).toBe("100");
    expect(postJson.mock.calls[1][1].variables.cursor).toBe("101");
  });

  it("shares pending requests, invalidates changed positions, and polls again after the cache expires", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(100_000);
    const postJson = vi.fn().mockResolvedValue({ data: { tradeEvents: [event()] } });
    const fetcher = createGmsolChartTradesFetcher({ postJson });
    const first = fetcher(params());
    expect(fetcher(params())).toBe(first);
    await first;
    await fetcher({ ...params(), positions: { [position.key]: { ...position, sizeInUsd: position.sizeInUsd + 1n } } });
    expect(postJson).toHaveBeenCalledTimes(2);
    const changedParams = {
      ...params(),
      positions: { [position.key]: { ...position, sizeInUsd: position.sizeInUsd + 1n } },
    };
    now.mockReturnValue(114_999);
    await fetcher(changedParams);
    expect(postJson).toHaveBeenCalledTimes(2);
    now.mockReturnValue(115_000);
    await fetcher(changedParams);
    expect(postJson).toHaveBeenCalledTimes(3);
    await fetcher({ ...params(), account: OWNER.toLowerCase() });
    expect(postJson).toHaveBeenCalledTimes(4);
  });

  it("retries GraphQL errors instead of caching an empty result", async () => {
    const postJson = vi
      .fn()
      .mockResolvedValueOnce({ data: { tradeEvents: [] }, errors: [{ message: "Indexer unavailable" }] })
      .mockResolvedValueOnce({ data: { tradeEvents: [event()] } });
    const fetcher = createGmsolChartTradesFetcher({ postJson });
    await expect(fetcher(params())).rejects.toThrow("Indexer unavailable");
    expect(await fetcher(params())).toHaveLength(1);
    expect(postJson).toHaveBeenCalledTimes(2);
  });
});
