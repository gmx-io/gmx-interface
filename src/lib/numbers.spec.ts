import { PRECISION } from "./legacy";
import { bigintToNumber, numberToBigint } from "./numbers";

describe("numbers.ts", () => {
  it("bigintToNumber", () => {
    expect(bigintToNumber(0n, 30)).toEqual(0);
    expect(bigintToNumber(1n, 30)).toEqual(1e-30);
    expect(bigintToNumber(PRECISION, 30)).toEqual(1);
    expect(bigintToNumber(PRECISION * 100n, 30)).toEqual(100);
    expect(bigintToNumber(PRECISION * 2n, 30)).toEqual(2);
    expect(bigintToNumber(PRECISION / 2n, 30)).toEqual(0.5);

    expect(bigintToNumber(1123456n, 6)).toEqual(1.123456);
    expect(bigintToNumber(-1123456n, 6)).toEqual(-1.123456);
  });

  it("numberToBigint", () => {
    expect(numberToBigint(0, 30)).toEqual(0n);
    expect(numberToBigint(1e-30, 30)).toEqual(1n);
    expect(numberToBigint(-1e-30, 30)).toEqual(-1n);
    expect(numberToBigint(1, 30)).toEqual(PRECISION);
    expect(numberToBigint(100, 30)).toEqual(PRECISION * 100n);
    expect(numberToBigint(2, 30)).toEqual(PRECISION * 2n);
    expect(numberToBigint(0.5, 30)).toEqual(PRECISION / 2n);
    expect(numberToBigint(-0.5, 30)).toEqual(-PRECISION / 2n);

    expect(numberToBigint(1.1234567, 6)).toEqual(1123456n);
    expect(numberToBigint(1.12345678, 6)).toEqual(1123456n);
    expect(numberToBigint(1.123456789, 6)).toEqual(1123456n);
    expect(numberToBigint(-1.123456789, 6)).toEqual(-1123456n);
  });
});
