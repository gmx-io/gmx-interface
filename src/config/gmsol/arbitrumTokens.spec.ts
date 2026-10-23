import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { getTokenBySymbolSafe } from "sdk/configs/tokens";

import { GMSOL_TO_ARBITRUM_SYMBOL } from "./arbitrumTokens";
import { GMSOL_NATIVE_TOKEN, GMSOL_TOKENS } from "./tokens";

describe("GMSOL_TO_ARBITRUM_SYMBOL", () => {
  it("maps exactly the Solana tokens, native SOL included", () => {
    const solanaAddresses = [GMSOL_NATIVE_TOKEN, ...GMSOL_TOKENS].map((token) => token.address).sort();

    expect(Object.keys(GMSOL_TO_ARBITRUM_SYMBOL).sort()).toEqual(solanaAddresses);
  });

  it("points only to symbols listed on Arbitrum", () => {
    const missing = Object.values(GMSOL_TO_ARBITRUM_SYMBOL).filter((symbol) => !getTokenBySymbolSafe(ARBITRUM, symbol));

    expect(missing).toEqual([]);
  });
});
