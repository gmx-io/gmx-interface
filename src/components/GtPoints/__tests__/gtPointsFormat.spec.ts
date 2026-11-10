import { describe, expect, it } from "vitest";

import {
  estimateGtSale,
  filterChartPeriod,
  formatChartAmount,
  formatChartPrice,
  formatCountdown,
  formatGt,
  formatMinStakeAmount,
  formatTableDateTime,
  getChartAxis,
  getCombinedFeeDiscount,
  getGtReferralLink,
  getMinStakeAmount,
  getVipProgress,
  shortenSolanaAddress,
} from "../gtPointsFormat";
import { GT_DECIMALS } from "../gtPointsTypes";

const gt = (value: number) => BigInt(Math.round(value * 10 ** GT_DECIMALS));

describe("formatGt", () => {
  it("uses 2 decimals from 1 GT up and 4 below", () => {
    expect(formatGt(gt(1284.56))).toBe("1,284.56 GT");
    expect(formatGt(gt(0.0003))).toBe("0.0003 GT");
    expect(formatGt(0n)).toBe("0.00 GT");
  });

  it("adds a sign when asked", () => {
    expect(formatGt(gt(0.0366), { signed: true })).toBe("+0.0366 GT");
    expect(formatGt(-gt(120), { signed: true })).toBe("−120.00 GT");
  });

  it("can drop decimals for tier thresholds", () => {
    expect(formatGt(gt(6000), { decimals: 0 })).toBe("6,000 GT");
  });
});

describe("getVipProgress", () => {
  it("starts at VIP 0 with 600 GT to go", () => {
    const progress = getVipProgress(0n);
    expect(progress.current.level).toBe(0);
    expect(progress.next?.level).toBe(1);
    expect(progress.toNext).toBe(gt(600));
    expect(progress.percentToNext).toBe(0);
  });

  it("finds the tier and the way to the next one", () => {
    const progress = getVipProgress(gt(1284.56));
    expect(progress.current.level).toBe(1);
    expect(progress.next?.level).toBe(2);
    expect(progress.toNext).toBe(gt(715.44));
    expect(progress.percentToNext).toBeCloseTo(48.89, 2);
  });

  it("reaches a tier exactly at its threshold", () => {
    expect(getVipProgress(gt(2000)).current.level).toBe(2);
    expect(getVipProgress(gt(1999.99)).current.level).toBe(1);
  });

  it("stops at VIP 9", () => {
    const progress = getVipProgress(gt(6_543_210.98));
    expect(progress.current.level).toBe(9);
    expect(progress.next).toBeUndefined();
    expect(progress.toNext).toBe(0n);
    expect(progress.percentToNext).toBe(100);
  });
});

describe("formatCountdown", () => {
  it("shows hours, minutes and seconds", () => {
    expect(formatCountdown(3 * 3_600 + 46 * 60 + 12)).toBe("03h 46m 12s");
  });

  it("adds days when needed", () => {
    expect(formatCountdown(22 * 86_400 + 4 * 3_600)).toBe("22d 04h 00m");
  });

  it("never goes below zero", () => {
    expect(formatCountdown(-5)).toBe("00h 00m 00s");
  });
});

describe("shortenSolanaAddress", () => {
  it("keeps the start and the end of long addresses", () => {
    expect(shortenSolanaAddress("DemoWallet0002xxxxxxxxxxxxxxxxxxxxxx0002")).toBe("DemoWa…xx0002");
  });

  it("leaves short names alone", () => {
    expect(shortenSolanaAddress("GT Vault")).toBe("GT Vault");
  });
});

describe("estimateGtSale", () => {
  const usd = (value: number) => BigInt(Math.round(value * 10_000)) * 10n ** 26n;
  // 218.70 USDC to spend, 56.84 GT already submitted, pool estimate $3.8471/GT
  const pool = { maxBuybackUsd: usd(218.7), queuedGt: gt(56.84), estPriceUsd: usd(3.8471), nextBuybackAt: 0 };

  it("keeps the pool estimate for nothing sold", () => {
    expect(estimateGtSale(pool, 0n)).toEqual({ priceUsd: pool.estPriceUsd, proceedsUsd: 0n });
  });

  it("includes your own GT in the price, so a big sale gets a lower price", () => {
    const { priceUsd, proceedsUsd } = estimateGtSale(pool, gt(845.2));
    expect(Number(priceUsd / 10n ** 26n) / 10_000).toBeCloseTo(0.2424, 3);
    expect(proceedsUsd <= pool.maxBuybackUsd).toBe(true);
  });

  it("never goes above the pool estimate (minting-price cap)", () => {
    const capped = { ...pool, maxBuybackUsd: usd(1_000_000) };
    expect(estimateGtSale(capped, gt(1)).priceUsd).toBe(pool.estPriceUsd);
  });
});

describe("getGtReferralLink", () => {
  it("adds the code and opens the app on Solana", () => {
    const link = getGtReferralLink("demo_0002");
    expect(link).toContain("/trade/?ref=demo_0002");
    expect(link).toContain("chainId=solana");
  });
});

describe("formatTableDateTime", () => {
  it("always uses two-digit hours so table rows line up", () => {
    const morning = new Date(2026, 10, 7, 7, 23).getTime() / 1000;
    const afternoon = new Date(2026, 10, 7, 15, 24).getTime() / 1000;
    expect(formatTableDateTime(morning)).toBe("07 Nov 2026, 07:23 AM");
    expect(formatTableDateTime(afternoon)).toBe("07 Nov 2026, 03:24 PM");
  });
});

describe("minimum stake", () => {
  const lp = (value: number) => BigInt(Math.round(value * 1e6)) * 10n ** 12n;
  const usd = (value: number) => BigInt(Math.round(value * 10_000)) * 10n ** 26n;

  it("is $1 worth of the token, shown rounded up so the shown amount always passes", () => {
    // 10 GLV worth $12.80 = $1.28 per GLV, so 0.78125 GLV
    const min = getMinStakeAmount({ balance: lp(10), valueUsd: usd(12.8) })!;
    expect(min).toBe(781_250_000_000_000_000n);
    expect(formatMinStakeAmount(min, "GLV")).toBe("0.79 GLV");
  });

  it("keeps exact minimums, and more decimals for pricey tokens", () => {
    expect(formatMinStakeAmount(getMinStakeAmount({ balance: lp(4), valueUsd: usd(5) })!, "GLV")).toBe("0.80 GLV");
    expect(formatMinStakeAmount(getMinStakeAmount({ balance: lp(1), valueUsd: usd(150) })!, "GM")).toBe("0.00667 GM");
  });

  it("has no minimum without a price", () => {
    expect(getMinStakeAmount({ balance: 0n, valueUsd: 0n })).toBeUndefined();
  });
});

describe("getChartAxis", () => {
  it("fits the values with 10% padding and round ticks, not from zero", () => {
    const axis = getChartAxis([20_000_000, 42_000_000, 60_000_000])!;
    expect(axis.domain).toEqual([16_000_000, 64_000_000]);
    expect(axis.ticks).toEqual([20_000_000, 30_000_000, 40_000_000, 50_000_000, 60_000_000]);
  });

  it("zooms in on small ranges", () => {
    const axis = getChartAxis([3.2, 3.5, 3.9])!;
    expect(axis.step).toBeCloseTo(0.2, 10);
    expect(axis.ticks.map((tick) => tick.toFixed(2))).toEqual(["3.20", "3.40", "3.60", "3.80"]);
  });

  it("never goes below zero and still pads a flat line", () => {
    expect(getChartAxis([0.1, 3.9])!.domain[0]).toBe(0);
    const flat = getChartAxis([5, 5])!;
    expect(flat.domain[0]).toBeLessThan(5);
    expect(flat.domain[1]).toBeGreaterThan(5);
  });

  it("starts bar axes at zero", () => {
    const axis = getChartAxis([60_000, 140_000], { fromZero: true })!;
    expect(axis.domain[0]).toBe(0);
    expect(axis.ticks[0]).toBe(0);
    expect(axis.domain[1]).toBeGreaterThan(140_000);
  });

  it("has no axis without values", () => {
    expect(getChartAxis([])).toBeUndefined();
    expect(getChartAxis([NaN, Infinity])).toBeUndefined();
    expect(getChartAxis([1, NaN, 2])!.ticks.length).toBeGreaterThan(0);
  });
});

describe("chart axis labels", () => {
  it("adds decimals only when the step needs them", () => {
    expect(formatChartAmount(20_000_000, 10_000_000)).toBe("20M");
    expect(formatChartAmount(22_500_000, 2_500_000)).toBe("22.5M");
    expect(formatChartAmount(850_000, 50_000)).toBe("850k");
    expect(formatChartPrice(3.2, 0.2)).toBe("$3.20");
    expect(formatChartPrice(3.825, 0.025)).toBe("$3.825");
  });

  it("handles big and tiny steps without repeating labels", () => {
    expect(formatChartAmount(1_100_000_000, 100_000_000)).toBe("1.1B");
    expect(formatChartAmount(2.5, 2.5)).toBe("2.5");
    expect(formatChartAmount(60_000, 20_000, "$")).toBe("$60k");
    expect(formatChartPrice(1_750, 250)).toBe("$1,750");
    expect(formatChartPrice(0.0102, 0.0002)).toBe("$0.0102");
  });
});

describe("getCombinedFeeDiscount", () => {
  it("multiplies the VIP and referral discounts", () => {
    expect(getCombinedFeeDiscount(9)).toBe(18.1);
    expect(getCombinedFeeDiscount(2)).toBe(11.8);
    expect(getCombinedFeeDiscount(0)).toBe(10);
    expect(getCombinedFeeDiscount(10)).toBe(19);
  });
});

describe("filterChartPeriod", () => {
  it("keeps the last N UTC days, even when the daily runs drift by a few seconds", () => {
    const day = 86_400;
    const points = Array.from({ length: 40 }, (_, index) => ({
      timestamp: (1_000 + index) * day + 43_200 + (index % 2 ? 5 : -5),
    }));
    expect(filterChartPeriod(points, 30)).toHaveLength(30);
    expect(filterChartPeriod(points, undefined)).toHaveLength(40);
  });
});
