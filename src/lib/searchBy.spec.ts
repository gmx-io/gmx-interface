import { describe, it, expect } from "vitest";
import { searchBy } from "./searchBy";

describe("searchBy", () => {
  const items = [
    { id: 1, name: "Bitcoin", symbol: "BTC", description: "Digital gold" },
    { id: 2, name: "Ethereum", symbol: "ETH", description: "Smart contract platform blockchain" },
    { id: 3, name: "Cardano", symbol: "ADA", description: "Proof of stake blockchain" },
  ];

  it("should search by a single field", () => {
    const result = searchBy(items, ["name"], "bitcoin");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Bitcoin");
  });

  it("should search by multiple fields", () => {
    const result = searchBy(items, ["name", "symbol"], "eth");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Ethereum");
  });

  it("should be case insensitive", () => {
    const result = searchBy(items, ["name"], "BITCOIN");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Bitcoin");
  });

  it("should return empty array when no matches found", () => {
    const result = searchBy(items, ["name", "symbol"], "xyz");
    expect(result).toHaveLength(0);
  });

  it("should handle empty search text", () => {
    const result = searchBy(items, ["name"], "");
    expect(result).toEqual(items);
  });

  it("should handle function field selectors", () => {
    const result = searchBy(items, [(item) => `${item.name} ${item.symbol}`], "Bitcoin BTC");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Bitcoin");
  });

  it("should match partial text in any position", () => {
    const result = searchBy(items, ["description"], "gold");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Bitcoin");
  });

  it("should handle multiple matches", () => {
    const result = searchBy(items, ["description"], "blockchain");
    expect(result).toHaveLength(2);
    expect(result.map((item) => item.name)).toEqual(["Ethereum", "Cardano"]);
  });

  it("should handle both direct fields and function selectors", () => {
    const result = searchBy(items, ["name", (item) => item.description], "gold");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Bitcoin");
  });
});
