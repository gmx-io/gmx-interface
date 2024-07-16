import { bigMath } from "./bigmath";
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
  const ONE = 1n;
  const FIFTY = BigInt(50);

  it(`1..50 check`, () => {
    const cases = Array.from({ length: 50 }).map((_, i) => i + 1);
    cases.forEach((correctAnswerRaw) => {
      const correctAnswer = BigInt(correctAnswerRaw);
      const { result } = bigNumberBinarySearch(ONE, FIFTY, ONE, (x) => {
        return { isValid: x <= correctAnswer, returnValue: null };
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
    const from = 1n;
    const to = 10n ** 32n;
    const delta = 10n ** 15n;
    const { result } = bigNumberBinarySearch(from, to, delta, (x) => {
      return { isValid: x <= correctAnswer, returnValue: null };
    });

    checkWithDelta(result, correctAnswer, delta);
  });

  it("1..250..1000", () => {
    const correctAnswer = 250n;
    const from = 1n;
    const to = 1000n;
    const delta = 1n;

    const { result } = bigNumberBinarySearch(from, to, delta, (x) => {
      return { isValid: x <= correctAnswer, returnValue: null };
    });

    checkWithDelta(result, correctAnswer, delta);
  });
});

function checkWithDelta(result: bigint, correctAnswer: bigint, delta: bigint) {
  expect(bigMath.abs(result - correctAnswer) <= delta * 2n).toBeTruthy();
}
