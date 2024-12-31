import { bigMath } from "./bigmath";

describe("bigMath", () => {
  describe("abs", () => {
    it("should return the absolute value of a number", () => {
      expect(bigMath.abs(10n)).toBe(10n);
      expect(bigMath.abs(-10n)).toBe(10n);
    });
  });

  describe("mulDiv", () => {
    it("should return the result of multiplying two numbers and dividing by a third", () => {
      expect(bigMath.mulDiv(10n, 10n, 2n)).toBe(50n);
      expect(bigMath.mulDiv(10n, 10n, 3n)).toBe(33n);
    });
  });

  describe("max", () => {
    it("should return the maximum value of a list of numbers", () => {
      expect(bigMath.max(10n, 20n, -30n)).toBe(20n);
      expect(bigMath.max(30n, 20n, 10n)).toBe(30n);
    });
  });

  describe("min", () => {
    it("should return the minimum value of a list of numbers", () => {
      expect(bigMath.min(10n, 20n, -30n)).toBe(-30n);
      expect(bigMath.min(30n, 20n, 10n)).toBe(10n);
    });
  });

  describe("avg", () => {
    it("should return the average value of a list of numbers", () => {
      expect(bigMath.avg(10n, 20n, 30n)).toBe(20n);
      expect(bigMath.avg(10n, 20n, 30n, 40n, undefined)).toBe(25n);
    });

    it("should return undefined if no values are provided", () => {
      expect(bigMath.avg()).toBe(undefined);
      expect(bigMath.avg(undefined, undefined)).toBe(undefined);
    });
  });
});
