import { describe, expect, it } from "vitest";

import { convertToCSV, protectCsvCell, serializeCsv } from "./csv";

describe("serializeCsv", () => {
  it("serializes headers-only exports", () => {
    expect(serializeCsv(["first", "second"], [])).toBe("first,second\r\n");
  });

  it("uses RFC 4180 escaping", () => {
    expect(
      serializeCsv(
        ["plain", "quoted", "multiline"],
        [
          {
            plain: "value",
            quoted: 'a,"quoted" value',
            multiline: "first\nsecond",
          },
        ]
      )
    ).toBe('plain,quoted,multiline\r\nvalue,"a,""quoted"" value","first\nsecond"\r\n');
  });

  it("protects formulas without modifying numeric values", () => {
    expect(protectCsvCell('=HYPERLINK("https://example.com")')).toBe('\'=HYPERLINK("https://example.com")');
    expect(protectCsvCell("  @SUM(A1:A2)")).toBe("'  @SUM(A1:A2)");
    expect(protectCsvCell("-12.50")).toBe("-12.50");
    expect(protectCsvCell("+12.50")).toBe("+12.50");
  });
});

describe("convertToCSV", () => {
  it("keeps field values under their custom display headers", () => {
    expect(convertToCSV([{ size: "10", pnl: "-1" }], { size: "Size", pnl: "PnL" })).toBe("Size,PnL\r\n10,-1\r\n");
  });

  it("derives headers from data when no custom headers are given", () => {
    expect(convertToCSV([{ size: "10" }])).toBe("size\r\n10\r\n");
  });
});
