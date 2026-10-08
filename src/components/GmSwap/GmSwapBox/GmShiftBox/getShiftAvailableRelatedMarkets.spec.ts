import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import type { GlvAndGmMarketsInfoData, GlvInfo, GlvOrMarketInfo, MarketInfo } from "domain/synthetics/markets/types";
import type { AccountWhitelistsResult } from "domain/synthetics/whitelists/useAccountWhitelistsRequest";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { getShiftAvailableRelatedMarkets } from "./getShiftAvailableRelatedMarkets";

const USDG = getTokenBySymbol(ARBITRUM, "USDG").address;
const USDC = getTokenBySymbol(ARBITRUM, "USDC").address;
const WETH = getTokenBySymbol(ARBITRUM, "WETH").address;

function market(marketTokenAddress: string, longTokenAddress: string, shortTokenAddress: string) {
  return { marketTokenAddress, longTokenAddress, shortTokenAddress } as MarketInfo;
}

function glv(glvTokenAddress: string, marketAddresses: string[]) {
  return {
    isGlv: true,
    glvTokenAddress,
    markets: marketAddresses.map((address) => ({ address })),
  } as unknown as GlvInfo;
}

function toMarketsInfoData(markets: GlvOrMarketInfo[]): GlvAndGmMarketsInfoData {
  return Object.fromEntries(markets.map((m) => [isGlvInfo(m) ? m.glvTokenAddress : m.marketTokenAddress, m]));
}

const LOADED_EMPTY_RESULT: AccountWhitelistsResult = { accountWhitelists: { deposit: { markets: {}, glvs: {} } } };
const LOADING_RESULT: AccountWhitelistsResult = { accountWhitelists: undefined };

describe("getShiftAvailableRelatedMarkets", () => {
  const current = market("0x0000000000000000000000000000000000000001", WETH, USDC);
  const whitelisted = market("0x0000000000000000000000000000000000000002", WETH, USDC);
  const gated = market("0x0000000000000000000000000000000000000003", WETH, USDC);
  const relatedGlv = glv("0x0000000000000000000000000000000000000004", [current.marketTokenAddress]);
  const markets = [current, whitelisted, gated, relatedGlv];

  const whitelistsResult: AccountWhitelistsResult = {
    accountWhitelists: {
      deposit: {
        markets: { [whitelisted.marketTokenAddress]: true, [gated.marketTokenAddress]: false },
        glvs: {},
      },
    },
  };

  it("excludes related markets the account is not whitelisted for and keeps related GLVs", () => {
    const result = getShiftAvailableRelatedMarkets({
      chainId: ARBITRUM,
      marketsInfoData: toMarketsInfoData(markets),
      sortedMarketsInfoByIndexToken: markets,
      marketTokenAddress: current.marketTokenAddress,
      whitelistsResult,
    });

    expect(result).toEqual([whitelisted, relatedGlv]);
  });

  it("without a current market drops blocked GMs and keeps GLVs", () => {
    const result = getShiftAvailableRelatedMarkets({
      chainId: ARBITRUM,
      marketsInfoData: toMarketsInfoData(markets),
      sortedMarketsInfoByIndexToken: markets,
      whitelistsResult,
    });

    expect(result).toEqual([current, whitelisted, relatedGlv]);
  });

  it("excludes related USDG pools until whitelists load", () => {
    const usdgCurrent = market("0x0000000000000000000000000000000000000005", USDG, USDG);
    const usdgRelated = market("0x0000000000000000000000000000000000000006", USDG, USDG);
    const usdgMarkets = [usdgCurrent, usdgRelated];
    const params: Omit<Parameters<typeof getShiftAvailableRelatedMarkets>[0], "whitelistsResult"> = {
      chainId: ARBITRUM,
      marketsInfoData: toMarketsInfoData(usdgMarkets),
      sortedMarketsInfoByIndexToken: usdgMarkets,
      marketTokenAddress: usdgCurrent.marketTokenAddress,
    };

    expect(getShiftAvailableRelatedMarkets({ ...params, whitelistsResult: LOADING_RESULT })).toEqual([]);
    expect(getShiftAvailableRelatedMarkets({ ...params, whitelistsResult: LOADED_EMPTY_RESULT })).toEqual([
      usdgRelated,
    ]);
  });
});
