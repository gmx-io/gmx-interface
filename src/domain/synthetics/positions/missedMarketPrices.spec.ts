import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { metrics } from "lib/metrics";

import { createMissedMarketPricesTracker } from "./missedMarketPrices";

const CHAIN_ID = 42161;
const ETH_MARKET = "0xethMarket";
const BTC_MARKET = "0xbtcMarket";
const DELISTING_MARKET = "0xdelistingMarket";

vi.mock("config/markets", () => ({
  isDelistingMarket: (_chainId: number, marketAddress: string) => marketAddress === DELISTING_MARKET,
}));

describe("trackMissedMarketPrices", () => {
  let pushCounterSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    pushCounterSpy = vi.spyOn(metrics, "pushCounter").mockImplementation(() => undefined) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const missing = (marketAddress: string, source: "usePositions" | "useKeysAndPricesParams" = "usePositions") => ({
    chainId: CHAIN_ID,
    marketAddress,
    marketName: `${marketAddress} name`,
    source,
    hasPrices: false,
  });

  it("pushes the counter once while the prices stay missing", () => {
    const track = createMissedMarketPricesTracker();

    track(missing(ETH_MARKET));
    track(missing(ETH_MARKET));
    track(missing(ETH_MARKET));

    expect(pushCounterSpy).toHaveBeenCalledTimes(1);
    expect(pushCounterSpy).toHaveBeenCalledWith("missedMarketPrices", {
      marketName: `${ETH_MARKET} name`,
      source: "usePositions",
    });
  });

  it("pushes the counter again after the prices came back and disappeared once more", () => {
    const track = createMissedMarketPricesTracker();

    track(missing(ETH_MARKET));
    track({ ...missing(ETH_MARKET), hasPrices: true });
    track(missing(ETH_MARKET));

    expect(pushCounterSpy).toHaveBeenCalledTimes(2);
  });

  it("counts markets and sources separately", () => {
    const track = createMissedMarketPricesTracker();

    track(missing(ETH_MARKET, "usePositions"));
    track(missing(ETH_MARKET, "useKeysAndPricesParams"));
    track(missing(BTC_MARKET, "usePositions"));

    expect(pushCounterSpy).toHaveBeenCalledTimes(3);
  });

  it("falls back to the market address when the market is unknown", () => {
    const track = createMissedMarketPricesTracker();

    track({ ...missing(ETH_MARKET), marketName: undefined });

    expect(pushCounterSpy).toHaveBeenCalledWith("missedMarketPrices", {
      marketName: ETH_MARKET,
      source: "usePositions",
    });
  });

  it("skips delisting markets", () => {
    const track = createMissedMarketPricesTracker();

    track(missing(DELISTING_MARKET));

    expect(pushCounterSpy).not.toHaveBeenCalled();
  });
});
