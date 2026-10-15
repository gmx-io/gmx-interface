import { describe, expect, it } from "vitest";

import { AVALANCHE } from "config/chains";
import type { UserIncentiveDistribution } from "domain/synthetics/common/useUserIncentiveData";
import { MarketsData } from "domain/synthetics/markets";
import { findImage } from "lib/legacy";
import { getTokenBySymbol, getTokens } from "sdk/configs/tokens";

import { getNormalizedIncentive } from "./utils";

const GM_AVAX_ADDRESS = "0x08b25A2a89036d298D6dB8A74ace9d1ce6Db15E5";
const GLV_AVAX_ADDRESS = "0x901eE57f7118A7be56ac079cbCDa7F22663A3874";
const WAVAX_ADDRESS = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";

const gmMarkets: MarketsData = {
  [GM_AVAX_ADDRESS]: {
    marketTokenAddress: GM_AVAX_ADDRESS,
    indexTokenAddress: WAVAX_ADDRESS,
    longTokenAddress: WAVAX_ADDRESS,
    shortTokenAddress: WAVAX_ADDRESS,
    isSameCollaterals: true,
    isSpotOnly: false,
    name: "AVAX/USD [WAVAX-WAVAX]",
    data: "",
  },
};

function getIncentive(tokens: string[]): UserIncentiveDistribution {
  return {
    id: "distribution-1",
    typeId: "1001",
    tokens,
    amounts: tokens.map(() => "1000000000000000000"),
    amountsInUsd: tokens.map(() => "0"),
    receiver: "0x23E597332a5D7ADDaa1d30167A307668c6fD3c70",
    timestamp: 1738713600,
    transactionHash: "0x47418b3ef6c17da4f2ff90234ca3d9ed35235b3af5c383a0d5add47f672478d8",
  };
}

function normalize(tokens: string[]) {
  return getNormalizedIncentive(AVALANCHE, getIncentive(tokens), getTokens(AVALANCHE), gmMarkets, undefined)
    .tokenIncentiveDetails;
}

describe("getNormalizedIncentive", () => {
  it("labels GM tokens with the market name and uses the GM icon", () => {
    const [details] = normalize([GM_AVAX_ADDRESS.toLowerCase()]);

    expect(details.symbol).toBe("AVAX/USD [WAVAX-WAVAX]");
    expect(details.iconSymbol).toBe("GM");
    expect(findImage(`ic_${details.iconSymbol!.toLowerCase()}.svg`)).toBeDefined();
  });

  it("uses the token symbol for regular tokens", () => {
    const usdc = getTokenBySymbol(AVALANCHE, "USDC");
    const [details] = normalize([usdc.address.toLowerCase()]);

    expect(details.symbol).toBe("USDC");
    expect(details.iconSymbol).toBe("USDC");
    expect(details.decimals).toBe(usdc.decimals);
  });

  it("labels GLV tokens as GLV", () => {
    const [details] = normalize([GLV_AVAX_ADDRESS.toLowerCase()]);

    expect(details.symbol).toBe("GLV");
    expect(details.iconSymbol).toBe("GLV");
    expect(findImage("ic_glv.svg")).toBeDefined();
  });

  it("leaves unknown tokens without a symbol", () => {
    const [details] = normalize(["0x0000000000000000000000000000000000000001"]);

    expect(details.symbol).toBeUndefined();
    expect(details.iconSymbol).toBeUndefined();
  });
});
