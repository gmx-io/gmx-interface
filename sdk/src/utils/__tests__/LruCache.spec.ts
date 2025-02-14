import { describe, expect, it } from "vitest";
import { LRUCache } from "../LruCache";

describe("LruCache", () => {
  it("should store and retrieve values", () => {
    const cache = new LRUCache<number>(2);
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
  });

  it("should return undefined for non-existing keys", () => {
    const cache = new LRUCache<number>(2);
    expect(cache.get("x")).toBeUndefined();
  });

  it("should update recent usage when getting a key", () => {
    const cache = new LRUCache<number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a"); // 'a' is now the most recently used
    cache.set("c", 3); // 'b' should be evicted
    expect(cache.has("b")).toBe(false);
    expect(cache.has("a")).toBe(true);
  });

  it("should evict the least recently used key when capacity is exceeded", () => {
    const cache = new LRUCache<number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3); // 'a' is removed
    expect(cache.has("a")).toBe(false);
    expect(cache.has("b")).toBe(true);
    expect(cache.get("c")).toBe(3);
  });

  it("should update existing keys without eviction", () => {
    const cache = new LRUCache<number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("a", 10); // update 'a'
    expect(cache.get("a")).toBe(10);
    expect(cache.has("b")).toBe(true);
  });

  it("should throw error if key is not a string", () => {
    const cache = new LRUCache<number>(2);
    expect(() => cache.set(123 as any, 1)).toThrow("Key must be a string");
  });
});
