import { ARBITRUM } from "config/chains";
import { getArbitrumSymbolForGmsolToken } from "config/gmsol/arbitrumTokens";
import type { PriceDelta } from "domain/synthetics/tokens/use24hPriceDeltaMap";
import type { Bar, FromNewToOldArray } from "domain/tradingview/types";
import { getOracleKeeperFetcher, type OracleFetcher, type TickersResponse } from "lib/oracleKeeperFetcher";
import { getNormalizedTokenSymbol, getTokens, getWrappedToken } from "sdk/configs/tokens";
import { parseContractPrice } from "sdk/utils/tokens";
import type { TokenPricesData } from "sdk/utils/tokens/types";

export type GmsolPriceDeltaMap = Partial<Record<string, PriceDelta>>;

// Solana markets have no oracle keeper of their own: prices, candles and 24h stats are read from the Arbitrum
// keeper through GMSOL_TO_ARBITRUM_SYMBOL. Results are keyed by Solana mint (NATIVE_TOKEN_ADDRESS for native SOL).
export class GmsolOracleFetcher {
  constructor(private readonly arbitrumFetcher: OracleFetcher = getOracleKeeperFetcher(ARBITRUM)) {}

  // Prices are 30-decimal USD per whole token, so they do not depend on the Solana mint decimals.
  async fetchPrices(gmsolTokenAddresses: readonly string[]): Promise<TokenPricesData> {
    const tickers = await this.arbitrumFetcher.fetchTickers();
    const tickersByAddress = new Map(tickers.map((ticker) => [ticker.tokenAddress.toLowerCase(), ticker]));
    const result: TokenPricesData = {};

    for (const address of gmsolTokenAddresses) {
      const symbol = getArbitrumSymbolForGmsolToken(address);
      const match = symbol ? findTicker(symbol, tickersByAddress) : undefined;

      if (match) {
        result[address] = {
          minPrice: parseContractPrice(BigInt(match.ticker.minPrice), match.decimals),
          maxPrice: parseContractPrice(BigInt(match.ticker.maxPrice), match.decimals),
        };
      }
    }

    return result;
  }

  fetchCandles(gmsolTokenAddress: string, period: string, limit: number): Promise<FromNewToOldArray<Bar>> {
    const symbol = getArbitrumSymbolForGmsolToken(gmsolTokenAddress);

    if (!symbol) {
      return Promise.reject(new Error(`No Arbitrum token for Solana token ${gmsolTokenAddress}`));
    }

    return this.arbitrumFetcher.fetchOracleCandles(symbol, period, limit);
  }

  async fetch24hPriceDeltas(gmsolTokenAddresses: readonly string[]): Promise<GmsolPriceDeltaMap> {
    const candles = await this.arbitrumFetcher.fetch24hPrices();
    const result: GmsolPriceDeltaMap = {};

    for (const address of gmsolTokenAddresses) {
      const symbol = getArbitrumSymbolForGmsolToken(address);
      const candle = symbol
        ? candles.find((c) => c.tokenSymbol === symbol || c.tokenSymbol === getNormalizedTokenSymbol(symbol))
        : undefined;

      if (!candle) {
        continue;
      }

      const deltaPrice = candle.close - candle.open;
      const deltaPercentage = (deltaPrice * 100) / candle.open;
      const deltaPercentageStr =
        deltaPercentage > 0 ? `+${deltaPercentage.toFixed(2)}%` : `${deltaPercentage.toFixed(2)}%`;

      result[address] = { ...candle, deltaPrice, deltaPercentage, deltaPercentageStr };
    }

    return result;
  }
}

// Arbitrum lists some symbols twice (BTC: v1 and synthetic) and quotes native ETH under WETH, so try every
// token with the symbol and fall back to the wrapped token for a native one.
function findTicker(
  symbol: string,
  tickersByAddress: Map<string, TickersResponse[number]>
): { ticker: TickersResponse[number]; decimals: number } | undefined {
  for (const token of getTokens(ARBITRUM)) {
    if (token.symbol !== symbol) {
      continue;
    }

    const quoted = token.isNative ? getWrappedToken(ARBITRUM) : token;
    const ticker = tickersByAddress.get(quoted.address.toLowerCase());

    if (ticker) {
      return { ticker, decimals: quoted.decimals };
    }
  }

  return undefined;
}

let cachedFetcher: GmsolOracleFetcher | undefined;

export function getGmsolOracleFetcher(): GmsolOracleFetcher {
  if (!cachedFetcher) {
    cachedFetcher = new GmsolOracleFetcher();
  }

  return cachedFetcher;
}
