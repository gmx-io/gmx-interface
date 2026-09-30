import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { getTokenBySymbol } from "sdk/configs/tokens";
import type { Market } from "sdk/utils/markets/types";
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

const whitelists: AccountWhitelists = {
  deposit: {
    markets: { [WHITELISTED_MARKET]: true, [DENIED_MARKET]: false },
  },
};

function market(p: { marketTokenAddress: string; longTokenAddress: string; shortTokenAddress: string }): Market {
  return {
    ...p,
    indexTokenAddress: p.longTokenAddress,
    isSameCollaterals: p.longTokenAddress === p.shortTokenAddress,
    isSpotOnly: false,
    name: "",
    data: "",
  };
}

const LOADED_RESULT: AccountWhitelistsResult = { accountWhitelists: whitelists };
const LOADING_RESULT: AccountWhitelistsResult = { accountWhitelists: undefined };
const FAILED_RESULT: AccountWhitelistsResult = { accountWhitelists: undefined, error: new Error("request failed") };

function usdgPool(marketTokenAddress: string): Market {
  return market({ marketTokenAddress, longTokenAddress: USDG, shortTokenAddress: USDG });
}

function wethUsdcPool(marketTokenAddress: string): Market {
  return market({ marketTokenAddress, longTokenAddress: WETH, shortTokenAddress: USDC });
}

describe("getDirectDepositAccess", () => {
  it.each<{
    case: string;
    whitelistsResult: AccountWhitelistsResult;
    market: Market;
    expected: DirectDepositAccess;
  }>([
    {
      case: "non-USDG pool absent from loaded response",
      whitelistsResult: LOADED_RESULT,
      market: wethUsdcPool(ABSENT_MARKET),
      expected: "ungated",
    },
    {
      case: "USDG pool absent from loaded response",
      whitelistsResult: LOADED_RESULT,
      market: usdgPool(ABSENT_MARKET),
      expected: "ungated",
    },
    {
      case: "account whitelisted",
      whitelistsResult: LOADED_RESULT,
      market: wethUsdcPool(WHITELISTED_MARKET),
      expected: "whitelisted",
    },
    {
      case: "account not whitelisted",
      whitelistsResult: LOADED_RESULT,
      market: wethUsdcPool(DENIED_MARKET),
      expected: "denied",
    },
    {
      case: "non-USDG pool while whitelists load",
      whitelistsResult: LOADING_RESULT,
      market: wethUsdcPool(DENIED_MARKET),
      expected: "ungated",
    },
    {
      case: "non-USDG pool when whitelists fail",
      whitelistsResult: FAILED_RESULT,
      market: wethUsdcPool(DENIED_MARKET),
      expected: "ungated",
    },
    {
      case: "USDG pool while whitelists load",
      whitelistsResult: LOADING_RESULT,
      market: usdgPool(DENIED_MARKET),
      expected: "loading",
    },
    {
      case: "USDG pool when whitelists fail",
      whitelistsResult: FAILED_RESULT,
      market: usdgPool(DENIED_MARKET),
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
