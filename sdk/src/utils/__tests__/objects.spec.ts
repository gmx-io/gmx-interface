import { describe, expect, it } from "vitest";

import { setByKey, updateByKey, getByKey, objectKeysDeep } from "../objects";
describe("setByKey", () => {
  it("should set a key in an object", () => {
    const obj = { a: 1, b: 2 };
    const key = "c";
    const data = 3;

    expect(setByKey(obj, key, data)).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should set a key in an empty object", () => {
    const obj = {};
    const key = "c";
    const data = 3;

    expect(setByKey(obj, key, data)).toEqual({ c: 3 });
  });

  it("should set a key in an object with existing key", () => {
    const obj = { a: 1, b: 2 };
    const key = "b";
    const data = 3;

    expect(setByKey(obj, key, data)).toEqual({ a: 1, b: 3 });
  });
});

describe("updateByKey", () => {
  it("should update a key in an object", () => {
    const obj = { a: { x: 1, y: 2 }, b: { x: 3, y: 4 } };
    const key = "b";
    const data = { y: 5 };

    expect(updateByKey(obj, key, data)).toEqual({ a: { x: 1, y: 2 }, b: { x: 3, y: 5 } });
  });

  it("should update a key in an empty object", () => {
    const obj = {};
    const key = "b";
    const data = { y: 5 };

    expect(updateByKey(obj, key, data)).toEqual({});
  });

  it("should update a key in an object with non-existing key", () => {
    const obj = { a: { x: 1, y: 2 }, b: { x: 3, y: 4 } };
    const key = "c";
    const data = { y: 5 };

    expect(updateByKey(obj, key, data)).toEqual({ a: { x: 1, y: 2 }, b: { x: 3, y: 4 } });
  });
});

describe("getByKey", () => {
  it("should get a key in an object", () => {
    const obj = { a: 1, b: 2 };
    const key = "b";

    expect(getByKey(obj, key)).toEqual(2);
  });

  it("should get a key in an empty object", () => {
    const obj = {};
    const key = "b";

    expect(getByKey(obj, key)).toEqual(undefined);
  });

  it("should get a non-existing key in an object", () => {
    const obj = { a: 1, b: 2 };
    const key = "c";

    expect(getByKey(obj, key)).toEqual(undefined);
  });
});

describe("objectKeysDeep", () => {
  it("should get all keys from a flat object", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const keys = objectKeysDeep(obj);
    expect(keys).toEqual(["a", "b", "c"]);
  });

  it("should get all keys from a nested object with default depth", () => {
    const obj = {
      a: 1,
      b: {
        x: 2,
        y: 3,
      },
      c: 4,
    };
    const keys = objectKeysDeep(obj);
    expect(keys).toEqual(["a", "b", "c", "x", "y"]);
  });

  it("should get all keys from a deeply nested object with custom depth", () => {
    const obj = {
      a: 1,
      b: {
        x: 2,
        y: {
          m: 3,
          n: 4,
        },
      },
      c: 5,
    };
    const keys = objectKeysDeep(obj, 2);
    expect(keys).toEqual(["a", "b", "c", "x", "y", "m", "n"]);
  });

  it("should respect depth limit when specified", () => {
    const obj = {
      a: 1,
      b: {
        x: 2,
        y: {
          m: 3,
          n: 4,
        },
      },
      c: 5,
    };
    const keys = objectKeysDeep(obj, 1);
    expect(keys).toEqual(["a", "b", "c", "x", "y"]);
  });

  it("should handle empty objects", () => {
    const obj = {};
    const keys = objectKeysDeep(obj);
    expect(keys).toEqual([]);
  });

  it("should handle objects with arrays", () => {
    const obj = {
      a: 1,
      b: [2, 3],
      c: {
        x: 4,
        y: [5, 6],
      },
    };
    const keys = objectKeysDeep(obj);
    expect(keys).toEqual(["a", "b", "c", "x", "y"]);
  });

  it("should handle objects with null values", () => {
    const obj = {
      a: 1,
      b: null,
      c: {
        x: 2,
        y: null,
      },
    };
    const keys = objectKeysDeep(obj);
    expect(keys).toEqual(["a", "b", "c", "x", "y"]);
  });
});
