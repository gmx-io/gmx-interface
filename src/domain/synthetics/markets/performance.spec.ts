import { describe, it, expect } from "vitest";

import { buildPerformanceSnapshots, calculatePerformance } from "./performance";

const makePriceSnapshot = ({ timestamp, price, token }: { timestamp: number, price: string; token: string }) => ({
  id: `${timestamp}`,
  minPrice: price,
  maxPrice: price,
  timestamp,
  isSnapshot: true,
  snapshotTimestamp: timestamp,
  token,
  type: token,
});

describe("calculatePerformance", () => {
  it("should calculate 0% performance for 1:1 prices", () => {
    const performance = calculatePerformance({
      poolStartPrice: 1,
      poolEndPrice: 1,
      tokenAStartPrice: 100,
      tokenBStartPrice: 100,
      tokenAEndPrice: 100,
      tokenBEndPrice: 100,
    });

    expect(performance).toEqual(0);
  });

  it("should calculate 100% performance for 1:2 prices", () => {
    const performance = calculatePerformance({
      poolStartPrice: 1,
      poolEndPrice: 2,
      tokenAStartPrice: 100,
      tokenBStartPrice: 100,
      tokenAEndPrice: 100,
      tokenBEndPrice: 100,
    });

    expect(performance).toEqual(1);
  });

  it("should calculate 20% performance for 1:1.2 prices", () => {
    const performance = calculatePerformance({
      poolStartPrice: 1,
      poolEndPrice: 1.2,
      tokenAStartPrice: 100,
      tokenBStartPrice: 100,
      tokenAEndPrice: 100,
      tokenBEndPrice: 100,
    });

    expect(performance).toEqual(0.2);
  });
});

describe("buildPerformanceSnapshots", () => {
  it("should return empty performance snapshots if there are no prices", () => {
    const performanceSnapshots = buildPerformanceSnapshots({
      longTokenPrices: {},
      shortTokenPrices: {},
      poolPrices: {},
    });

    expect(performanceSnapshots).toEqual([]);
  });

  it("should build performance snapshots for 1:2 price performance", () => {
    const performanceSnapshots = buildPerformanceSnapshots({
      longTokenPrices: {
        1: makePriceSnapshot({ timestamp: 1, price: "100", token: "A" }),
        2: makePriceSnapshot({ timestamp: 2, price: "100", token: "A" }),
      },
      shortTokenPrices: {
        1: makePriceSnapshot({ timestamp: 1, price: "100", token: "B" }),
        2: makePriceSnapshot({ timestamp: 2, price: "100", token: "B" }),
      },
      poolPrices: {
        1: makePriceSnapshot({ timestamp: 1, price: "100", token: "P" }),
        2: makePriceSnapshot({ timestamp: 2, price: "200", token: "P" }),
      },
    });

    expect(performanceSnapshots).toEqual([
      {
        performance: 0,
        snapshotTimestamp: 1,
      },
      {
        performance: 1,
        snapshotTimestamp: 2,
      },
    ]);
  });

  it("should correctly calculate performance snapshots for changing token prices", () => {
    const performanceSnapshots = buildPerformanceSnapshots({
      longTokenPrices: {
        1: makePriceSnapshot({ timestamp: 1, price: "100", token: "A" }),
        2: makePriceSnapshot({ timestamp: 2, price: "200", token: "A" }),
      },
      shortTokenPrices: {
        1: makePriceSnapshot({ timestamp: 1, price: "100", token: "B" }),
        2: makePriceSnapshot({ timestamp: 2, price: "200", token: "B" }),
      },
      poolPrices: {
        1: makePriceSnapshot({ timestamp: 1, price: "100", token: "P" }),
        2: makePriceSnapshot({ timestamp: 2, price: "300", token: "P" }),
      },
    });

    expect(performanceSnapshots).toEqual([
      {
        performance: 0,
        snapshotTimestamp: 1,
      },
      {
        performance: 1,
        snapshotTimestamp: 2,
      },
    ]);
  });

  it("should correctly calculate negative performance", () => {
    const performanceSnapshots = buildPerformanceSnapshots({
      longTokenPrices: {
        1: makePriceSnapshot({ timestamp: 1, price: "100", token: "A" }),
        2: makePriceSnapshot({ timestamp: 2, price: "200", token: "A" }),
      },
      shortTokenPrices: {
        1: makePriceSnapshot({ timestamp: 1, price: "100", token: "B" }),
        2: makePriceSnapshot({ timestamp: 2, price: "200", token: "B" }),
      },
      poolPrices: {
        1: makePriceSnapshot({ timestamp: 1, price: "100", token: "P" }),
        2: makePriceSnapshot({ timestamp: 2, price: "100", token: "P" }),
      },
    });

    expect(performanceSnapshots).toEqual([
      {
        performance: 0,
        snapshotTimestamp: 1,
      },
      {
        performance: -1,
        snapshotTimestamp: 2,
      },
    ]);
  });
  
  it("should skip empty prices snapshots and build only non-empty snapshots", () => {
    const performanceSnapshots = buildPerformanceSnapshots({
      longTokenPrices: {
        2: makePriceSnapshot({ timestamp: 2, price: "100", token: "A" }),
        3: makePriceSnapshot({ timestamp: 3, price: "100", token: "A" }),
      },
      shortTokenPrices: {
        2: makePriceSnapshot({ timestamp: 2, price: "100", token: "B" }),
        3: makePriceSnapshot({ timestamp: 3, price: "100", token: "B" }),
      },
      poolPrices: {
        1: makePriceSnapshot({ timestamp: 1, price: "100", token: "P" }),
        2: makePriceSnapshot({ timestamp: 2, price: "200", token: "P" }),
        3: makePriceSnapshot({ timestamp: 3, price: "300", token: "P" }),
      },
    });

    expect(performanceSnapshots).toEqual([
      {
        performance: 0,
        snapshotTimestamp: 2,
      },
      {
        performance: 0.5,
        snapshotTimestamp: 3,
      },
    ]);
  });
});