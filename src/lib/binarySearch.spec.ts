import { BigNumber } from "ethers";
import { numericBinarySearch, bigNumberBinarySearch } from "./binarySearch";
import { expandDecimals } from "./numbers";

describe("numericBinarySearch", () => {
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

describe("bigNumberBinarySearch", () => {
  const ONE = BigNumber.from(1);
  const FIFTY = BigNumber.from(50);

  it(`1..50 check`, () => {
    const cases = Array.from({ length: 50 }).map((_, i) => i + 1);
    cases.forEach((correctAnswerRaw) => {
      const correctAnswer = BigNumber.from(correctAnswerRaw);
      const { result } = bigNumberBinarySearch(ONE, FIFTY, ONE, (x) => {
        return { isValid: x.lte(correctAnswer), returnValue: null };
      });

      expect(result).toEqual(correctAnswer);
    });
  });

  it(`always false`, () => {
    const { result } = bigNumberBinarySearch(ONE, FIFTY, ONE, () => {
      return { isValid: false, returnValue: null };
    });
    expect(result).toEqual(ONE);
  });

  it("1..1e30..1e32", () => {
    const correctAnswer = expandDecimals(1, 30);
    const from = BigNumber.from(1);
    const to = BigNumber.from(10).pow(32);
    const delta = BigNumber.from(10).pow(15);
    const { result } = bigNumberBinarySearch(from, to, delta, (x) => {
      return { isValid: x.lte(correctAnswer), returnValue: null };
    });

    checkWithDelta(result, correctAnswer, delta);
  });

  it("1..250..1000", () => {
    const correctAnswer = BigNumber.from(250);
    const from = BigNumber.from(1);
    const to = BigNumber.from(1000);
    const delta = BigNumber.from(1);

    const { result } = bigNumberBinarySearch(from, to, delta, (x) => {
      return { isValid: x.lte(correctAnswer), returnValue: null };
    });

    checkWithDelta(result, correctAnswer, delta);
  });
});

function checkWithDelta(result: BigNumber, correctAnswer: BigNumber, delta: BigNumber) {
  expect(result.sub(correctAnswer).abs().lte(delta.mul(2))).toBeTruthy();
}
