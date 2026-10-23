import { describe, expect, it } from "vitest";

import { GMSOL_NATIVE_TOKEN, GMSOL_TOKENS } from "config/gmsol/tokens";
import type { OracleFetcher, TickersResponse } from "lib/oracleKeeperFetcher";

import { GmsolOracleFetcher } from "./gmsolOracleFetcher";

const mint = (symbol: string) => GMSOL_TOKENS.find((token) => token.symbol === symbol)!.address;

// Raw contract prices as returned by the Arbitrum keeper's /prices/tickers.
const ARB_SOL = { tokenAddress: "0x2bcC6D6CdBbDC0a4071e48bb3B969b06B3330c07", price: "104215325913408483750000" };
const ARB_WETH = { tokenAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", price: "2400408351264059" };
const ARB_BTC_V1 = { tokenAddress: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", price: "816835037550477250000000000" };
const ARB_BTC_SYNTH = {
  tokenAddress: "0x47904963fc8b2340414262125aF798B9655E58Cd",
  price: "816919348156295125000000000",
};
const ARB_USDC = { tokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", price: "999802621509980600000000" };

function ticker(p: { tokenAddress: string; price: string }): TickersResponse[number] {
  return {
    tokenAddress: p.tokenAddress,
    tokenSymbol: "",
    minPrice: p.price,
    maxPrice: p.price,
    oracleDecimals: 0,
    updatedAt: 0,
  };
}

const toCents = (usd30: bigint | undefined) => (usd30 === undefined ? undefined : usd30 / 10n ** 28n);

describe("GmsolOracleFetcher.fetchPrices", () => {
  it("prices Solana mints in 30-decimal USD with the Arbitrum token's decimals", async () => {
    const cases: { name: string; tickers: TickersResponse; expectedCents: Record<string, bigint | undefined> }[] = [
      {
        name: "SOL, WSOL and native SOL share the Arbitrum SOL ticker",
        tickers: [ticker(ARB_SOL)],
        expectedCents: { [mint("SOL")]: 10421n, [mint("WSOL")]: 10421n, [GMSOL_NATIVE_TOKEN.address]: 10421n },
      },
      {
        name: "ETH and WETH are quoted under the Arbitrum wrapped ETH address",
        tickers: [ticker(ARB_WETH)],
        expectedCents: { [mint("ETH")]: 240040n, [mint("WETH")]: 240040n },
      },
      {
        name: "BTC and WBTC use the v1 BTC ticker",
        tickers: [ticker(ARB_BTC_V1)],
        expectedCents: { [mint("BTC")]: 8168350n, [mint("WBTC")]: 8168350n },
      },
      {
        name: "BTC and WBTC use the synthetic BTC ticker",
        tickers: [ticker(ARB_BTC_SYNTH)],
        expectedCents: { [mint("BTC")]: 8169193n, [mint("WBTC")]: 8169193n },
      },
      {
        name: "ticker addresses match case-insensitively",
        tickers: [ticker({ ...ARB_USDC, tokenAddress: ARB_USDC.tokenAddress.toLowerCase() })],
        expectedCents: { [mint("USDC")]: 99n },
      },
      {
        name: "tokens without a mapping or a ticker are left out",
        tickers: [ticker(ARB_SOL)],
        expectedCents: { "11111111111111111111111111111111": undefined, [mint("BTC")]: undefined },
      },
    ];

    for (const { name, tickers, expectedCents } of cases) {
      const fetcher = new GmsolOracleFetcher({ fetchTickers: async () => tickers } as unknown as OracleFetcher);
      const prices = await fetcher.fetchPrices(Object.keys(expectedCents));

      for (const [address, cents] of Object.entries(expectedCents)) {
        expect({
          name,
          address,
          min: toCents(prices[address]?.minPrice),
          max: toCents(prices[address]?.maxPrice),
        }).toEqual({ name, address, min: cents, max: cents });
      }
    }
  });
});
