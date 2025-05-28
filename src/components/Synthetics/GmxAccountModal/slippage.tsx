import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";

export const SLIPPAGE_BPS = 50n;
export function applySlippageBps(amount: bigint, slippageBps: bigint) {
  return (amount * (BASIS_POINTS_DIVISOR_BIGINT - slippageBps)) / BASIS_POINTS_DIVISOR_BIGINT;
}
