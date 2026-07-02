import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";

import { getPriceTokenConfig } from "./useTokenRecentPricesData";

describe("getPriceTokenConfig", () => {
  it("resolves known GLV ticker addresses", () => {
    const glvToken = getPriceTokenConfig(ARBITRUM, "0x528a5bac7e746c9a509a1f4f6df58a03d44279f9");

    expect(glvToken?.address).toBe("0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9");
    expect(glvToken?.symbol).toBe("GLV");
    expect(glvToken?.decimals).toBe(18);
  });

  it("ignores unknown ticker addresses", () => {
    const token = getPriceTokenConfig(ARBITRUM, "0x0000000000000000000000000000000000000001");

    expect(token).toBeUndefined();
  });
});
