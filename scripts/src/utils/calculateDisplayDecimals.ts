import { bigMath } from "sdk/utils/bigmath";
import { bigintToNumber } from "sdk/utils/numbers";

export function calculateDisplayDecimals(price: bigint, decimals: number) {
  if (price === undefined || price === 0n) return 2;
  const priceNumber = bigintToNumber(bigMath.abs(price), decimals);

  if (isNaN(priceNumber)) return 2;
  if (priceNumber >= 1000) return 2;
  if (priceNumber >= 100) return 3;
  if (priceNumber >= 1) return 4;
  if (priceNumber >= 0.1) return 5;
  if (priceNumber >= 0.01) return 6;
  if (priceNumber >= 0.0001) return 7;
  if (priceNumber >= 0.00001) return 8;

  return 9;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}