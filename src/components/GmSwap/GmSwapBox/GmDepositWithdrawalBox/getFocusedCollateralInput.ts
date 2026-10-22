import { getTokenPoolType } from "domain/synthetics/markets/utils";
import type { Token } from "domain/tokens";

import type { FocusedInput } from "./types";

export function getFocusedCollateralInput(
  pool: { isSameCollaterals: boolean; longToken: Token; shortToken: Token } | undefined,
  tokenAddress: string
): FocusedInput | undefined {
  if (!pool) {
    return undefined;
  }

  if (pool.isSameCollaterals) {
    return "first";
  }

  return getTokenPoolType(pool, tokenAddress) === "long" ? "first" : "second";
}
