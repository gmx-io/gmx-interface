import { describe, expect, it } from "vitest";

import { ARBITRUM, AVALANCHE } from "configs/chains";
import { buildMarketsConfigsRequest } from "utils/markets/multicall";
import type { MarketsData } from "utils/markets/types";

const ETH_USDC_MARKET = "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336";

const marketsData: MarketsData = {
  [ETH_USDC_MARKET]: {
    marketTokenAddress: ETH_USDC_MARKET,
    indexTokenAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    longTokenAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    shortTokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    isSameCollaterals: false,
    isSpotOnly: false,
    name: "ETH/USD [WETH-USDC]",
    data: "",
  },
};

describe("buildMarketsConfigsRequest", () => {
  it("hashes the keys of a market without pre-built keys", async () => {
    // The keys of this market are pre-built for Arbitrum only, so on Avalanche they are hashed at runtime
    const params = { marketsAddresses: [ETH_USDC_MARKET], marketsData };
    const prebuiltRequest = await buildMarketsConfigsRequest(ARBITRUM, params);
    const hashedRequest = await buildMarketsConfigsRequest(AVALANCHE, params);

    expect(hashedRequest[`${ETH_USDC_MARKET}-dataStore`].calls).toEqual(
      prebuiltRequest[`${ETH_USDC_MARKET}-dataStore`].calls
    );
  });
});
