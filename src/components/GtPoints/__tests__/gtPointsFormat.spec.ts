import { describe, expect, it } from "vitest";

import {
  estimateGtSale,
  formatCountdown,
  formatGt,
  getGtReferralLink,
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
