import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { isValidTokenSafe } from "sdk/configs/tokens";

import { GMSOL_NATIVE_TOKEN, GMSOL_TOKENS } from "./tokens";

describe("GMSOL_TOKENS arbitrumTokenAddress", () => {
  it("points only to tokens listed on Arbitrum", () => {
    const missing = [GMSOL_NATIVE_TOKEN, ...GMSOL_TOKENS]
      .filter((token) => !isValidTokenSafe(ARBITRUM, token.arbitrumTokenAddress))
      .map((token) => token.symbol);

    expect(missing).toEqual([]);
  });
});
