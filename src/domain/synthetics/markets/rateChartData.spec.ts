import { describe, expect, it } from "vitest";

import type { RatesSnapshot } from "sdk/utils/rates/types";

import { buildRateChartData, hourlyRateToProjectedPercent, type RateProjection, type RateType } from "./rateChartData";

const sample: RatesSnapshot = {
  timestamp: 1795078800,
  fundingRateLong: "-10000000000000000000000",
  fundingRateShort: "20000000000000000000000",
  borrowingRateLong: "30000000000000000000000",
  borrowingRateShort: "0",
  netRateLong: "-40000000000000000000000",
  netRateShort: "20000000000000000000000",
};

describe("rate chart data", () => {
  it("keeps signed hourly rates and every projection consistent for both funding directions", () => {
    for (const direction of [1n, -1n]) {
      const snapshot = { ...sample };
      for (const side of ["Long", "Short"] as const) {
        snapshot[`fundingRate${side}`] = (BigInt(sample[`fundingRate${side}`]) * direction).toString();
        snapshot[`netRate${side}`] = (
          BigInt(snapshot[`fundingRate${side}`]) - BigInt(snapshot[`borrowingRate${side}`])
        ).toString();
      }
      for (const projection of ["1h", "8h", "24h", "1y"] as RateProjection[]) {
        const hours = { "1h": 1, "8h": 8, "24h": 24, "1y": 8760 }[projection];
        for (const rateType of ["netRate", "fundingRate", "borrowingRate"] as RateType[]) {
          const [point] = buildRateChartData({ snapshots: [snapshot], rateType, projection });
          const hourly = ["Long", "Short"].map(
            (side) =>
              BigInt(snapshot[`${rateType}${side}` as keyof Omit<RatesSnapshot, "timestamp">]) *
              3600n *
              (rateType === "borrowingRate" ? -1n : 1n)
          );
          const expected =
            rateType === "borrowingRate" ? [-0.0108, 0] : [-0.0036, 0.0072].map((v) => v * Number(direction));
          if (rateType === "netRate") expected[0] -= 0.0108;
          for (const [i, actual] of [point.longRate, point.shortRate].entries()) {
            expect(actual).toBeCloseTo(expected[i] * hours, 10);
            expect(actual).toBeCloseTo(hourlyRateToProjectedPercent(hourly[i], projection), 10);
          }
        }
      }
    }
  });

  it("leaves hourly gaps unknown and only connects live rates to recent history", () => {
    const args = { rateType: "netRate", projection: "1h", liveRates: { longRate: -0.02, shortRate: 0.01 } } as const;
    const next = { ...sample, timestamp: sample.timestamp + 3 * 3600 };
    const now = (next.timestamp + 1800) * 1000;
    const data = buildRateChartData({ ...args, snapshots: [sample, next], now });
    expect(data.map((point) => point.timestampMs)).toEqual([
      sample.timestamp * 1000,
      (sample.timestamp + 3600) * 1000,
      next.timestamp * 1000,
      now,
    ]);
    expect(data[1]).toMatchObject({ longRate: null, shortRate: null, raw: null });
    expect(data[2].longRateLive).toBe(data[2].longRate);
    expect(data[3]).toMatchObject({ longRate: null, shortRate: null, raw: null, shortRateLive: 0.01 });
    expect(data[3].longRateLive).toBe(-0.02);
    expect(buildRateChartData({ ...args, snapshots: [sample], now })).toHaveLength(1);
    expect(buildRateChartData({ ...args, snapshots: [], now })).toEqual([]);
  });
});
