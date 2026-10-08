import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { ETH_TOKEN } from "domain/testUtils/mockTokens";
import { getTokenBySymbol } from "sdk/configs/tokens";
import type { MarketInfo } from "sdk/utils/markets/types";
import type { TokenData } from "sdk/utils/tokens/types";

import { useFilterSortPools } from "./useFilterSortPools";

type Options = Parameters<typeof useFilterSortPools>[0];

function token(symbol: string): TokenData {
  return { ...getTokenBySymbol(ARBITRUM, symbol), prices: ETH_TOKEN.prices };
}

function pool(index: string, long: string, short: string, overrides: Partial<MarketInfo> = {}): MarketInfo {
  return createMockMarketInfo(token(index === "SWAP-ONLY" ? "ETH" : index), {
    marketTokenAddress: `${index}-${long}-${short}`,
    longToken: token(long),
    shortToken: token(short),
    isSpotOnly: index === "SWAP-ONLY",
    ...overrides,
  });
}

const pools = [
  pool("BTC", "BTC", "USDC"),
  pool("BTC", "BTC", "BTC"),
  pool("BTC", "TBTC", "TBTC"),
  pool("BTC", "USDG", "USDG"),
  pool("ETH", "WETH", "USDC"),
  pool("ETH", "WETH", "WETH"),
  pool("ETH", "WSTETH", "USDE"),
  pool("ETH", "USDG", "USDG"),
  pool("SOL", "SOL", "USDC"),
  pool("SOL", "SOL", "SOL"),
  pool("SOL", "BTC", "USDC"),
  pool("SOL", "USDG", "USDG"),
  pool("WLD", "WETH", "USDC"),
  pool("ENA", "WETH", "USDC"),
  pool("XAUT", "WETH", "USDC"),
  pool("MEGA", "WETH", "USDC"),
  pool("SWAP-ONLY", "WSTETH", "WETH"),
  pool("SWAP-ONLY", "USDC", "USDG"),
  pool("SWAP-ONLY", "USDC", "USDC.e"),
  pool("SWAP-ONLY", "USDC", "USDT"),
];

function search(searchText: string, overrides: Partial<Options> = {}, markets = pools) {
  let result: ReturnType<typeof useFilterSortPools> = [];

  function Harness() {
    result = useFilterSortPools({
      marketsInfo: Object.fromEntries(markets.map((market) => [market.marketTokenAddress, market])),
      marketTokensData: Object.fromEntries(
        markets.map((market) => [market.marketTokenAddress, { ...ETH_TOKEN, address: market.marketTokenAddress }])
      ),
      orderBy: "unspecified",
      direction: "unspecified",
      marketsTokensApyData: undefined,
      marketsTokensIncentiveAprData: undefined,
      marketsTokensLidoAprData: undefined,
      marketsTokensLaunchBoostAprData: undefined,
      performance: undefined,
      multichainMarketTokensBalances: undefined,
      pinnedAddresses: [],
      searchText,
      topLevelTab: "all",
      subCategoryTab: "all",
      favoriteTokens: [],
      ...overrides,
    });
    return null;
  }

  renderToStaticMarkup(<Harness />);
  return result.map((marketToken) => marketToken.address);
}

describe("useFilterSortPools search", () => {
  it.each([
    ["btc", ["BTC-BTC-USDC", "BTC-BTC-BTC", "BTC-TBTC-TBTC", "BTC-USDG-USDG"]],
    [
      "eth",
      [
        "ETH-WETH-USDC",
        "ETH-WETH-WETH",
        "ETH-WSTETH-USDE",
        "ETH-USDG-USDG",
        "ENA-WETH-USDC",
        "XAUT-WETH-USDC",
        "MEGA-WETH-USDC",
        "SWAP-ONLY-WSTETH-WETH",
      ],
    ],
    ["sol", ["SOL-SOL-USDC", "SOL-SOL-SOL", "SOL-BTC-USDC", "SOL-USDG-USDG"]],
  ])("preserves the existing index-token results for %s", (query, expected) => {
    expect(search(query)).toEqual(expected);
  });

  it("puts the swap-only USDG pool before collateral-only matches without duplicates", () => {
    expect(search("usdg")).toEqual(["SWAP-ONLY-USDC-USDG", "BTC-USDG-USDG", "ETH-USDG-USDG", "SOL-USDG-USDG"]);
  });

  it("keeps swap-only USDC pools first and preserves order within both groups", () => {
    expect(search("usdc")).toEqual([
      "SWAP-ONLY-USDC-USDG",
      "SWAP-ONLY-USDC-USDC.e",
      "SWAP-ONLY-USDC-USDT",
      "BTC-BTC-USDC",
      "ETH-WETH-USDC",
      "SOL-SOL-USDC",
      "SOL-BTC-USDC",
      "WLD-WETH-USDC",
      "ENA-WETH-USDC",
      "XAUT-WETH-USDC",
      "MEGA-WETH-USDC",
    ]);
  });

  it.each(["usde", "UsDe", "  usde  ", "steth-usd"])("matches collateral symbols for %s", (query) => {
    expect(search(query)).toEqual(["ETH-WSTETH-USDE"]);
  });

  it.each(["usdc", "btc"])("ignores leading and trailing whitespace for %s", (query) => {
    expect(search(`  ${query}  `)).toEqual(search(query));
  });

  it("does not search collateral token names", () => {
    expect(search("Global Dollar")).toEqual([]);
  });

  it("shows only the three USDG-backed markets in the Crypto tab", () => {
    expect(search("usdg", { topLevelTab: "crypto" })).toEqual(["BTC-USDG-USDG", "ETH-USDG-USDG", "SOL-USDG-USDG"]);
  });

  it("checks index-token matches across all tabs before filtering favorites", () => {
    expect(search("btc", { topLevelTab: "favorites", favoriteTokens: ["SOL-BTC-USDC"] })).toEqual([]);
  });

  it("checks index-token matches before filtering subcategories", () => {
    const markets = [
      pool("BTC", "BTC", "USDC"),
      pool("SOL", "BTC", "USDC", { indexToken: { ...token("SOL"), categories: ["meme"] } }),
    ];
    expect(search("btc", { topLevelTab: "crypto", subCategoryTab: "meme" }, markets)).toEqual([]);
  });

  it("does not let disabled markets suppress collateral matches", () => {
    const markets = [pool("BTC", "BTC", "USDC", { isDisabled: true }), pool("SOL", "BTC", "USDC")];
    expect(search("btc", {}, markets)).toEqual(["SOL-BTC-USDC"]);
  });

  it("does not let markets without a listed market token suppress collateral matches", () => {
    const markets = [pool("BTC", "BTC", "USDC"), pool("SOL", "BTC", "USDC")];
    expect(
      search("btc", { marketTokensData: { "SOL-BTC-USDC": { ...ETH_TOKEN, address: "SOL-BTC-USDC" } } }, markets)
    ).toEqual(["SOL-BTC-USDC"]);
  });

  it("keeps alias matches and prevents collateral fallback when an alias matches", () => {
    const markets = [
      pool("BTC", "BTC", "BTC", { indexToken: { ...token("BTC"), searchAliases: ["USDG"] } }),
      pool("ETH", "USDG", "USDG"),
    ];
    expect(search("usdg", {}, markets)).toEqual(["BTC-BTC-BTC"]);
  });

  it("returns no pools for an unmatched query", () => {
    expect(search("zzz")).toEqual([]);
  });

  it("keeps the normal pool list for whitespace-only queries", () => {
    expect(search("   ")).toEqual(search(""));
  });
});
