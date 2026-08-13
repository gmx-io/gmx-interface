import { describe, expect, it } from "vitest";

import {
  fetchAllHistoryExportPages,
  formatDecimal,
  getDateRangeToken,
  getHistoryExportFilename,
  getLogIndexFromIndexerId,
} from "./utils";

describe("history export utils", () => {
  it("formats raw values without localization or scientific notation", () => {
    expect(formatDecimal(1234500n, 6)).toBe("1.2345");
    expect(formatDecimal(-25n, 1)).toBe("-2.5");
    expect(formatDecimal(undefined, 6)).toBe("");
    expect(formatDecimal(25n, undefined)).toBe("");
  });

  it("formats date range tokens", () => {
    const start = Date.UTC(2026, 6, 1) / 1000;
    const end = Date.UTC(2026, 6, 31) / 1000;
    expect(getDateRangeToken(start, end)).toBe("20260701-20260731");
    expect(getDateRangeToken(start)).toBe("from-20260701");
    expect(getDateRangeToken(undefined, end)).toBe("to-20260731");
    expect(getDateRangeToken()).toBe("all-time");
  });

  it("uses the selected calendar dates in filename ranges", () => {
    const start = new Date(2026, 6, 1);
    const end = new Date(2026, 6, 31);
    expect(getDateRangeToken(start, end)).toBe("20260701-20260731");
  });

  it("preserves address casing in filenames", () => {
    expect(
      getHistoryExportFilename({
        surface: "trade-history",
        account: "0xAbC",
        chainId: 42161,
        format: "gmx-detailed",
        schemaVersion: 1,
        extension: "csv",
      })
    ).toBe("gmx-trade-history-0xAbC-arbitrum-all-time-gmx-detailed-schema-1.csv");
  });

  it("extracts log indexes from Subsquid ids", () => {
    expect(getLogIndexFromIndexerId("0xAbC:70")).toBe("70");
    expect(getLogIndexFromIndexerId("opaque-id")).toBe("");
  });

  it("fetches every source page and reports progress", async () => {
    const progress: number[] = [];
    const result = await fetchAllHistoryExportPages({
      pageSize: 2,
      fetchPage: async (pageIndex) => ({
        items: [1, 2, 3, 4, 5].slice(pageIndex * 2, pageIndex * 2 + 2),
        totalCount: 5,
      }),
      onProgress: ({ loadedRecords }) => progress.push(loadedRecords),
    });

    expect(result).toEqual([1, 2, 3, 4, 5]);
    expect(progress).toEqual([2, 4, 5]);
  });

  it("fails when a source stops before its reported total", async () => {
    await expect(
      fetchAllHistoryExportPages({
        pageSize: 2,
        fetchPage: async (pageIndex) => ({ items: pageIndex === 0 ? [1, 2] : [], totalCount: 3 }),
      })
    ).rejects.toThrow("incomplete page");
  });

  it("supports cancellation between pages", async () => {
    const controller = new AbortController();
    await expect(
      fetchAllHistoryExportPages({
        pageSize: 1,
        signal: controller.signal,
        fetchPage: async () => {
          controller.abort();
          return { items: [1], totalCount: 2 };
        },
      })
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
