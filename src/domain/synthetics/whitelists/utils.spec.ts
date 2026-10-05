import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import type { GlvInfo, GlvOrMarketInfo, MarketInfo } from "domain/synthetics/markets/types";
import { getTokenBySymbol } from "sdk/configs/tokens";
import type { AccountWhitelists } from "sdk/utils/whitelists/types";

import type { AccountWhitelistsResult } from "./useAccountWhitelistsRequest";
import {
  getWhitelistedMarketAddresses,
  getDirectDepositAccess,
  getIsDirectDepositBlocked,
  type DirectDepositAccess,
} from "./utils";

const USDG = getTokenBySymbol(ARBITRUM, "USDG").address;
const USDC = getTokenBySymbol(ARBITRUM, "USDC").address;
const WETH = getTokenBySymbol(ARBITRUM, "WETH").address;

const WHITELISTED_MARKET = "0x0000000000000000000000000000000000000001";
const DENIED_MARKET = "0x0000000000000000000000000000000000000002";
const ABSENT_MARKET = "0x0000000000000000000000000000000000000003";
const WHITELISTED_GLV = "0x0000000000000000000000000000000000000004";
const DENIED_GLV = "0x0000000000000000000000000000000000000005";
const ABSENT_GLV = "0x0000000000000000000000000000000000000006";

const whitelists: AccountWhitelists = {
  deposit: {
    markets: { [WHITELISTED_MARKET]: true, [DENIED_MARKET]: false },
    glvs: { [WHITELISTED_GLV]: true, [DENIED_GLV]: false },
  },
};

function market(p: { marketTokenAddress: string; longTokenAddress: string; shortTokenAddress: string }) {
  return { ...p, isSpotOnly: false } as MarketInfo;
}

const LOADED_RESULT: AccountWhitelistsResult = { accountWhitelists: whitelists };
const LOADING_RESULT: AccountWhitelistsResult = { accountWhitelists: undefined };
const FAILED_RESULT: AccountWhitelistsResult = { accountWhitelists: undefined, error: new Error("request failed") };

function usdgPool(marketTokenAddress: string): MarketInfo {
  return market({ marketTokenAddress, longTokenAddress: USDG, shortTokenAddress: USDG });
}

function swapPool(marketTokenAddress: string): MarketInfo {
  return market({ marketTokenAddress, longTokenAddress: USDC, shortTokenAddress: USDG });
}

function wethUsdcPool(marketTokenAddress: string): MarketInfo {
  return market({ marketTokenAddress, longTokenAddress: WETH, shortTokenAddress: USDC });
}

function glv(glvTokenAddress: string, longTokenAddress: string, shortTokenAddress: string) {
  return { isGlv: true, glvTokenAddress, longTokenAddress, shortTokenAddress } as GlvInfo;
}

describe("getDirectDepositAccess", () => {
  it.each<{
    case: string;
    whitelistsResult: AccountWhitelistsResult;
    glvOrMarket: GlvOrMarketInfo;
    expected: DirectDepositAccess;
  }>([
    {
      case: "non-USDG pool absent from loaded response",
      whitelistsResult: LOADED_RESULT,
      glvOrMarket: wethUsdcPool(ABSENT_MARKET),
      expected: "ungated",
    },
    {
      case: "USDG pool absent from loaded response",
      whitelistsResult: LOADED_RESULT,
      glvOrMarket: usdgPool(ABSENT_MARKET),
      expected: "ungated",
    },
    {
      case: "account whitelisted",
      whitelistsResult: LOADED_RESULT,
      glvOrMarket: wethUsdcPool(WHITELISTED_MARKET),
      expected: "whitelisted",
    },
    {
      case: "account not whitelisted",
      whitelistsResult: LOADED_RESULT,
      glvOrMarket: wethUsdcPool(DENIED_MARKET),
      expected: "denied",
    },
    {
      case: "non-USDG pool while whitelists load",
      whitelistsResult: LOADING_RESULT,
      glvOrMarket: wethUsdcPool(DENIED_MARKET),
      expected: "ungated",
    },
    {
      case: "non-USDG pool when whitelists fail",
      whitelistsResult: FAILED_RESULT,
      glvOrMarket: wethUsdcPool(DENIED_MARKET),
      expected: "ungated",
    },
    {
      case: "USDG pool while whitelists load",
      whitelistsResult: LOADING_RESULT,
      glvOrMarket: usdgPool(DENIED_MARKET),
      expected: "loading",
    },
    {
      case: "USDG pool when whitelists fail",
      whitelistsResult: FAILED_RESULT,
      glvOrMarket: usdgPool(DENIED_MARKET),
      expected: "denied",
    },
    {
      case: "USDC-USDG swap pool while whitelists load",
      whitelistsResult: LOADING_RESULT,
      glvOrMarket: swapPool(DENIED_MARKET),
      expected: "loading",
    },
    {
      case: "USDC-USDG swap pool when whitelists fail",
      whitelistsResult: FAILED_RESULT,
      glvOrMarket: swapPool(DENIED_MARKET),
      expected: "denied",
    },
  ])("$case -> $expected", ({ expected, ...params }) => {
    expect(getDirectDepositAccess({ chainId: ARBITRUM, ...params })).toBe(expected);
  });
});

describe("getDirectDepositAccess for GLVs", () => {
  it.each<{
    case: string;
    whitelistsResult: AccountWhitelistsResult;
    glvOrMarket: GlvOrMarketInfo;
    expected: DirectDepositAccess;
  }>([
    {
      case: "USDG GLV absent from loaded response",
      whitelistsResult: LOADED_RESULT,
      glvOrMarket: glv(ABSENT_GLV, USDG, USDG),
      expected: "ungated",
    },
    {
      case: "account whitelisted",
      whitelistsResult: LOADED_RESULT,
      glvOrMarket: glv(WHITELISTED_GLV, USDG, USDG),
      expected: "whitelisted",
    },
    {
      case: "account not whitelisted",
      whitelistsResult: LOADED_RESULT,
      glvOrMarket: glv(DENIED_GLV, USDG, USDG),
      expected: "denied",
    },
    {
      case: "a GLV listed only under markets",
      whitelistsResult: LOADED_RESULT,
      glvOrMarket: glv(DENIED_MARKET, USDG, USDG),
      expected: "ungated",
    },
    {
      case: "non-USDG GLV when whitelists fail",
      whitelistsResult: FAILED_RESULT,
      glvOrMarket: glv(DENIED_GLV, WETH, USDC),
      expected: "ungated",
    },
    {
      case: "USDG GLV while whitelists load",
      whitelistsResult: LOADING_RESULT,
      glvOrMarket: glv(DENIED_GLV, USDG, USDG),
      expected: "loading",
    },
    {
      case: "USDG GLV when whitelists fail",
      whitelistsResult: FAILED_RESULT,
      glvOrMarket: glv(DENIED_GLV, USDG, USDG),
      expected: "denied",
    },
  ])("$case -> $expected", ({ expected, ...params }) => {
    expect(getDirectDepositAccess({ chainId: ARBITRUM, ...params })).toBe(expected);
  });
});

describe("getIsDirectDepositBlocked", () => {
  it.each<[DirectDepositAccess | undefined, boolean]>([
    ["ungated", false],
    ["whitelisted", false],
    [undefined, false],
    ["loading", true],
    ["denied", true],
  ])("%s -> %s", (access, expected) => {
    expect(getIsDirectDepositBlocked(access)).toBe(expected);
  });
});

describe("getWhitelistedMarketAddresses", () => {
  it("returns only the markets the account is whitelisted for", () => {
    expect(getWhitelistedMarketAddresses(whitelists)).toEqual([WHITELISTED_MARKET]);
  });

  it("returns nothing while whitelists are not loaded", () => {
    expect(getWhitelistedMarketAddresses(undefined)).toEqual([]);
  });
});
