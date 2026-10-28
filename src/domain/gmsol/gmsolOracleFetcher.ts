import { getIsSolanaNetworkEnabled } from "config/ab";
import { ARBITRUM } from "config/chains";
import { GMSOL_NATIVE_TOKEN, GMSOL_TOKENS } from "config/gmsol/tokens";
import { type PriceDelta, getPriceDelta } from "domain/synthetics/tokens/priceDelta";
import type { Bar, FromNewToOldArray } from "domain/tradingview/types";
import type { OracleFetcher } from "lib/oracleKeeperFetcher";
import { getNormalizedTokenSymbol, getToken } from "sdk/configs/tokens";
import { parseContractPrice } from "sdk/utils/tokens";
import type { Token, TokenPricesData } from "sdk/utils/tokens/types";

export type GmsolPriceDeltaMap = Partial<Record<string, PriceDelta>>;

const ARBITRUM_TOKEN_ADDRESS_BY_GMSOL_ADDRESS = new Map<string, string>(
  [GMSOL_NATIVE_TOKEN, ...GMSOL_TOKENS].map((token) => [token.address, token.arbitrumTokenAddress])
);

function assertSolanaNetworkEnabled() {
  if (!getIsSolanaNetworkEnabled()) {
    throw new Error("Solana network is disabled");
  }
}

function getArbitrumToken(gmsolTokenAddress: string): Token | undefined {
  const arbitrumTokenAddress = ARBITRUM_TOKEN_ADDRESS_BY_GMSOL_ADDRESS.get(gmsolTokenAddress);

  return arbitrumTokenAddress ? getToken(ARBITRUM, arbitrumTokenAddress) : undefined;
}

// Solana markets have no oracle keeper of their own: prices, candles and 24h stats are read from the Arbitrum
// keeper for each token's arbitrumTokenAddress. Results are keyed by Solana mint (NATIVE_TOKEN_ADDRESS for native SOL).
// The caller passes the Arbitrum keeper fetcher, so this class never creates or tracks one itself.
// Every method rejects while the solanaNetwork AB flag is off, so no keeper request is made for Solana.
export class GmsolOracleFetcher {
  constructor(private readonly arbitrumFetcher: OracleFetcher) {}

  // Prices are 30-decimal USD per whole token, so they do not depend on the Solana mint decimals.
  async fetchPrices(gmsolTokenAddresses: readonly string[]): Promise<TokenPricesData> {
    assertSolanaNetworkEnabled();

    const tickers = await this.arbitrumFetcher.fetchTickers();
    const tickersByAddress = new Map(tickers.map((ticker) => [ticker.tokenAddress.toLowerCase(), ticker]));
    const result: TokenPricesData = {};

    for (const address of gmsolTokenAddresses) {
      const arbitrumToken = getArbitrumToken(address);
      const ticker = arbitrumToken ? tickersByAddress.get(arbitrumToken.address.toLowerCase()) : undefined;

      if (arbitrumToken && ticker) {
        result[address] = {
          minPrice: parseContractPrice(BigInt(ticker.minPrice), arbitrumToken.decimals),
          maxPrice: parseContractPrice(BigInt(ticker.maxPrice), arbitrumToken.decimals),
        };
      }
    }

    return result;
  }

  async fetchCandles(gmsolTokenAddress: string, period: string, limit: number): Promise<FromNewToOldArray<Bar>> {
    assertSolanaNetworkEnabled();

    const arbitrumToken = getArbitrumToken(gmsolTokenAddress);

    if (!arbitrumToken) {
      throw new Error(`No Arbitrum token for Solana token ${gmsolTokenAddress}`);
    }

    return this.arbitrumFetcher.fetchOracleCandles(getNormalizedTokenSymbol(arbitrumToken.symbol), period, limit);
  }

  async fetch24hPriceDeltas(gmsolTokenAddresses: readonly string[]): Promise<GmsolPriceDeltaMap> {
    assertSolanaNetworkEnabled();

    const candles = await this.arbitrumFetcher.fetch24hPrices();
    const result: GmsolPriceDeltaMap = {};

    for (const address of gmsolTokenAddresses) {
      const arbitrumToken = getArbitrumToken(address);
      const delta = arbitrumToken ? getPriceDelta(candles, arbitrumToken.symbol) : undefined;

      if (delta) {
        result[address] = delta;
      }
    }

    return result;
  }
}
