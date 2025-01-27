import { setByKey, updateByKey, getByKey } from "../objects";
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
