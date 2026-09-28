import { describe, expect, it } from "vitest";

import { applyOrderAccountUpdate, reconcileOrderSnapshot } from "./orderAccountsCache";

type Entry = { slot: number; value: number };
const entry = (slot: number, value = 1): Entry => ({ slot, value });

describe("applyOrderAccountUpdate", () => {
  it("stores a new entry", () => {
    const cache = new Map<string, Entry>();
    expect(applyOrderAccountUpdate(cache, "a", 10, entry(10))).toBe(true);
    expect(cache.get("a")?.slot).toBe(10);
  });

  it("drops updates older than the cached slot", () => {
    const cache = new Map([["a", entry(10)]]);
    expect(applyOrderAccountUpdate(cache, "a", 9, entry(9))).toBe(false);
    expect(cache.get("a")?.slot).toBe(10);
  });

  it("accepts updates at the same or a newer slot", () => {
    const cache = new Map([["a", entry(10)]]);
    expect(applyOrderAccountUpdate(cache, "a", 10, entry(10, 5))).toBe(true);
    expect(applyOrderAccountUpdate(cache, "a", 11, entry(11, 7))).toBe(true);
    expect(cache.get("a")?.value).toBe(7);
  });

  it("removes an entry when the update is undefined", () => {
    const cache = new Map([["a", entry(10)]]);
    expect(applyOrderAccountUpdate(cache, "a", 11, undefined)).toBe(true);
    expect(cache.has("a")).toBe(false);
    expect(applyOrderAccountUpdate(cache, "b", 11, undefined)).toBe(false);
  });
});

describe("reconcileOrderSnapshot", () => {
  it("removes entries missing from the snapshot", () => {
    const cache = new Map([
      ["a", entry(10)],
      ["b", entry(10)],
    ]);
    expect(reconcileOrderSnapshot(cache, new Set(["a"]), 12)).toBe(true);
    expect([...cache.keys()]).toEqual(["a"]);
  });

  it("keeps entries updated after the snapshot slot", () => {
    const cache = new Map([["b", entry(15)]]);
    expect(reconcileOrderSnapshot(cache, new Set(), 12)).toBe(false);
    expect(cache.has("b")).toBe(true);
  });
});
