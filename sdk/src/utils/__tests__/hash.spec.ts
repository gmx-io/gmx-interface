import { hashData, hashString, hashDataMap } from "../hash";
import { LRUCache } from "../LruCache";

describe("hashData", () => {
  it("returns a valid hash and caches it", () => {
    const inputTypes = ["uint256", "string"];
    const inputValues = [123n, "hello"];
    const result = hashData(inputTypes, inputValues);
    expect(result).toBe("0x18a25ed45d79546dfca2565caa2ee3102fb46159dea4fde1d0a9c0cc78ce94e3");

    // Check cache
    const key = JSON.stringify({ dataTypes: inputTypes, dataValues: ["123", "hello"] });
    expect(new LRUCache<string>(10_000).has(key)).toBe(false);
  });

  it("returns cached hash if already computed", () => {
    const inputTypes = ["bool"];
    const inputValues = [true];
    const result1 = hashData(inputTypes, inputValues);
    const result2 = hashData(inputTypes, inputValues);
    expect(result1).toBe(result2);
  });
});

describe("hashString", () => {
  it("returns a valid hash for a string and caches it", () => {
    const str = "test-string";
    const hash1 = hashString(str);
    const hash2 = hashString(str);
    expect(hash1).toBe(hash2);
  });
});

describe("hashDataMap", () => {
  it("returns hashes for a given record map", () => {
    const result = hashDataMap({
      first: [["string"], ["hello"]],
      second: [["uint256"], [42n]],
      empty: undefined,
    });
    expect(Object.keys(result)).toContain("first");
    expect(Object.keys(result)).toContain("second");
    expect(Object.keys(result)).not.toContain("empty");
  });
});
