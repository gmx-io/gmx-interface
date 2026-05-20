import { MULTIPLIER_DECIMALS } from "./constants";

export function formatMultiplier(rawMultiplier: number | undefined): string {
  const value = (rawMultiplier ?? 0) / MULTIPLIER_DECIMALS;
  return `${value.toFixed(2)}x`;
}
