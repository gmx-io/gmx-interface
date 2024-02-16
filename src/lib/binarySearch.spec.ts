import { numericBinarySearch } from "./binarySearch";

describe("binarySearch", () => {
  it(`1..50 check`, () => {
    const cases = Array.from({ length: 50 }).map((_, i) => i + 1);
    cases.forEach((correctAnswer) => {
      const { result } = numericBinarySearch(1, 50, (x) => {
        return { isValid: x <= correctAnswer, returnValue: null };
      });
      expect(result).toEqual(correctAnswer);
    });
  });

  it(`always false`, () => {
    const { result } = numericBinarySearch(1, 50, () => {
      return { isValid: false, returnValue: null };
    });
    expect(result).toEqual(1);
  });
});
